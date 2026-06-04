import { Request, Response, NextFunction } from 'express'
import { Order } from '../models/Order'
import { Food }  from '../models/Food'
import { User }  from '../models/User'
import { ApiError, sendSuccess, sendPaginated } from '../utils/apiResponse'
import { AuthRequest } from '../middleware/auth'
import { logger } from '../utils/logger'

// ─── PLACE ORDER ──────────────────────────────────────────
export const placeOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { items, address, paymentMethod, loyaltyPointsToUse = 0 } = req.body

    if (!items?.length)    throw new ApiError(400, 'Order must have at least one item')
    if (!address)          throw new ApiError(400, 'Delivery address is required')
    if (!paymentMethod)    throw new ApiError(400, 'Payment method is required')

    // Validate and enrich items from DB
    const enrichedItems = []
    let subtotal = 0

    for (const item of items) {
      const food = await Food.findById(item.foodId)
      if (!food)            throw new ApiError(404, `Food not found: ${item.foodId}`)
      if (!food.isAvailable) throw new ApiError(400, `${food.name} is currently unavailable`)

      enrichedItems.push({
        foodId:   food._id,
        name:     food.name,
        quantity: item.quantity,
        price:    food.price,
        freeItems: food.freeItems,
        specialInstructions: item.specialInstructions || ''
      })
      subtotal += food.price * item.quantity
    }

    // Loyalty discount (1 point = ₹1, max 50% of order)
    const user = await User.findById(req.user!.userId)
    if (!user) throw new ApiError(404, 'User not found')

    let discount = 0
    if (loyaltyPointsToUse > 0) {
      const maxDiscount  = Math.floor(subtotal * 0.5)
      const pointsToUse  = Math.min(loyaltyPointsToUse, user.loyaltyPoints, maxDiscount)
      discount = pointsToUse
    }

    const deliveryCharge = subtotal >= 299 ? 0 : 20
    const taxes          = Math.round(subtotal * 0.05)
    const total          = subtotal + deliveryCharge + taxes - discount

    const order = await Order.create({
      userId: req.user!.userId,
      items:  enrichedItems,
      subtotal, deliveryCharge, taxes, discount, total,
      loyaltyPointsUsed: discount,
      address,
      paymentMethod,
      paymentId: `PAY-${Date.now()}`
    })

    // Deduct loyalty points used
    if (discount > 0) {
      user.loyaltyPoints -= discount
      await user.save({ validateBeforeSave: false })
    }

    logger.info(`Order placed: ${order.orderNumber} by ${user.email}`)

    return sendSuccess(res, {
      order: {
        id:           order._id,
        orderNumber:  order.orderNumber,
        total:        order.total,
        deliveryCharge,
        discount,
        promisedTime: order.promisedTime,
        status:       order.deliveryStatus
      }
    }, 'Order placed successfully', 201)
  } catch (err) { next(err) }
}

// ─── GET MY ORDERS ────────────────────────────────────────
export const getMyOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page  = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    const [orders, total] = await Promise.all([
      Order.find({ userId: req.user!.userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments({ userId: req.user!.userId })
    ])

    return sendPaginated(res, orders, total, page, limit)
  } catch (err) { next(err) }
}

// ─── GET ORDER BY ID ──────────────────────────────────────
export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) throw new ApiError(404, 'Order not found')
    if (order.userId.toString() !== req.user!.userId && req.user!.role !== 'admin')
      throw new ApiError(403, 'Access denied')
    return sendSuccess(res, { order })
  } catch (err) { next(err) }
}

// ─── TRACK ORDER ──────────────────────────────────────────
export const trackOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id)
      .select('orderNumber deliveryStatus currentLocation estimatedArrival promisedTime deliveryBoyId createdAt')
    if (!order) throw new ApiError(404, 'Order not found')
    if (order.userId.toString() !== req.user!.userId)
      throw new ApiError(403, 'Access denied')
    return sendSuccess(res, { order })
  } catch (err) { next(err) }
}

// ─── CANCEL ORDER ─────────────────────────────────────────
export const cancelOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) throw new ApiError(404, 'Order not found')
    if (order.userId.toString() !== req.user!.userId)
      throw new ApiError(403, 'Access denied')

    const cancellable = ['pending', 'confirmed']
    if (!cancellable.includes(order.deliveryStatus))
      throw new ApiError(400, `Cannot cancel order in "${order.deliveryStatus}" status`)

    order.deliveryStatus = 'cancelled'

    // Refund loyalty points if used
    if (order.loyaltyPointsUsed > 0) {
      await User.findByIdAndUpdate(req.user!.userId, {
        $inc: { loyaltyPoints: order.loyaltyPointsUsed }
      })
    }

    await order.save()
    logger.info(`Order cancelled: ${order.orderNumber}`)
    return sendSuccess(res, { orderNumber: order.orderNumber }, 'Order cancelled')
  } catch (err) { next(err) }
}

// ─── RATE ORDER ───────────────────────────────────────────
export const rateOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { rating, reviewText } = req.body
    const order = await Order.findById(req.params.id)
    if (!order) throw new ApiError(404, 'Order not found')
    if (order.userId.toString() !== req.user!.userId) throw new ApiError(403, 'Access denied')
    if (order.deliveryStatus !== 'delivered') throw new ApiError(400, 'Can only rate delivered orders')
    if (order.reviewed) throw new ApiError(400, 'Order already reviewed')

    order.rating     = rating
    order.reviewText = reviewText
    order.reviewed   = true
    await order.save()

    return sendSuccess(res, null, 'Thank you for your feedback!')
  } catch (err) { next(err) }
}

// ─── UPDATE STATUS (Admin/Internal) ───────────────────────
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, currentLocation } = req.body
    const order = await Order.findById(req.params.id)
    if (!order) throw new ApiError(404, 'Order not found')

    order.deliveryStatus = status
    if (currentLocation) order.currentLocation = currentLocation

    // Award loyalty points on delivery
    if (status === 'delivered') {
      const pointsEarned = Math.floor(order.total / 10)
      order.loyaltyPointsEarned = pointsEarned
      await User.findByIdAndUpdate(order.userId, {
        $inc: {
          loyaltyPoints: pointsEarned,
          totalOrders:   1,
          totalSpent:    order.total
        },
        lastOrderDate: new Date()
      })
      // Update food order counts
      for (const item of order.items) {
        await Food.findByIdAndUpdate(item.foodId, { $inc: { totalOrders: item.quantity } })
      }
    }

    await order.save()
    logger.info(`Order ${order.orderNumber} status → ${status}`)
    return sendSuccess(res, { orderNumber: order.orderNumber, status }, 'Status updated')
  } catch (err) { next(err) }
}
