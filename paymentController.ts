import { Request, Response, NextFunction } from 'express'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { Order } from '../models/Order'
import { User } from '../models/User'
import { ApiError, sendSuccess } from '../utils/apiResponse'
import { logger } from '../utils/logger'
import { AuthRequest } from '../middleware/auth'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
})

// ─── CREATE RAZORPAY ORDER ─────────────────────────────────
export const createRazorpayOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.body
    const order = await Order.findById(orderId)
    if (!order) throw new ApiError(404, 'Order not found')
    if (order.userId.toString() !== req.user!.userId) throw new ApiError(403, 'Unauthorized')

    const rzpOrder = await razorpay.orders.create({
      amount:   Math.round(order.total * 100), // paise
      currency: 'INR',
      receipt:  order.orderNumber,
      notes:    { orderId: orderId, orderNumber: order.orderNumber }
    })

    order.razorpayOrderId = rzpOrder.id
    await order.save({ validateBeforeSave: false })

    logger.info(`Razorpay order created: ${rzpOrder.id}`)
    return sendSuccess(res, {
      rzpOrderId:  rzpOrder.id,
      key:         process.env.RAZORPAY_KEY_ID,
      amount:      rzpOrder.amount,
      currency:    rzpOrder.currency,
      orderNumber: order.orderNumber
    })
  } catch (err) { next(err) }
}

// ─── VERIFY PAYMENT ────────────────────────────────────────
export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    // Verify signature
    const body     = razorpay_order_id + '|' + razorpay_payment_id
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expected !== razorpay_signature) throw new ApiError(400, 'Invalid payment signature')

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, userId: req.user!.userId })
    if (!order) throw new ApiError(404, 'Order not found')

    // Update order
    order.razorpayPaymentId = razorpay_payment_id
    order.razorpaySignature = razorpay_signature
    order.paymentStatus     = 'success'
    order.deliveryStatus    = 'confirmed'

    // Earn loyalty points (1 pt per ₹10)
    const pointsEarned = Math.floor(order.total / 10)
    order.loyaltyPointsEarned = pointsEarned

    await order.save()

    // Update user stats
    await User.findByIdAndUpdate(req.user!.userId, {
      $inc: { loyaltyPoints: pointsEarned }
    })

    logger.info(`Payment verified: ${razorpay_payment_id} for ${order.orderNumber}`)
    return sendSuccess(res, {
      orderNumber:       order.orderNumber,
      total:             order.total,
      loyaltyPointsEarned: pointsEarned,
      status:            order.deliveryStatus
    }, 'Payment successful! Order confirmed.')
  } catch (err) { next(err) }
}

// ─── RAZORPAY WEBHOOK ──────────────────────────────────────
export const paymentWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string
    const body      = JSON.stringify(req.body)
    const expected  = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expected !== signature) throw new ApiError(400, 'Invalid webhook signature')

    const event = req.body.event
    logger.info(`Razorpay webhook: ${event}`)

    switch (event) {
      case 'payment.captured':
        logger.info(`Payment captured: ${req.body.payload.payment.entity.id}`)
        break
      case 'payment.failed':
        const failedId = req.body.payload.payment.entity.notes?.orderId
        if (failedId) {
          await Order.findByIdAndUpdate(failedId, { paymentStatus: 'failed' })
        }
        break
      default:
        logger.info(`Unhandled webhook event: ${event}`)
    }

    res.status(200).json({ success: true })
  } catch (err) { next(err) }
}

// ─── CASH ON DELIVERY ──────────────────────────────────────
export const confirmCOD = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.body
    const order = await Order.findById(orderId)
    if (!order) throw new ApiError(404, 'Order not found')
    if (order.userId.toString() !== req.user!.userId) throw new ApiError(403, 'Unauthorized')
    if (order.paymentMethod !== 'cash') throw new ApiError(400, 'Not a COD order')

    order.paymentStatus  = 'pending' // will be 'success' on delivery
    order.deliveryStatus = 'confirmed'
    await order.save()

    return sendSuccess(res, { orderNumber: order.orderNumber }, 'COD order confirmed!')
  } catch (err) { next(err) }
}
