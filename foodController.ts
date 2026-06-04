import { Request, Response, NextFunction } from 'express'
import { Food } from '../models/Food'
import { ApiError, sendSuccess, sendPaginated } from '../utils/apiResponse'
import { cache, setCache, deleteCache } from '../utils/cache'
import { AuthRequest } from '../middleware/auth'

// ─── GET ALL FOODS (with filters + pagination) ─────────────
export const getFoods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1', limit = '20',
      category, religion, festival,
      minPrice, maxPrice,
      sortBy = 'popularity',
      search, isVeg
    } = req.query

    const query: any = { isAvailable: true }
    if (category)  query.category = category
    if (religion)  query.religion = religion
    if (festival)  query.festivals = festival
    if (isVeg !== undefined) query.isVeg = isVeg === 'true'
    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) query.price.$gte = Number(minPrice)
      if (maxPrice) query.price.$lte = Number(maxPrice)
    }
    if (search) {
      query.$or = [
        { name:             { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { tags:             { $regex: search, $options: 'i' } }
      ]
    }

    const pageNum  = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip     = (pageNum - 1) * limitNum

    const sortMap: Record<string, any> = {
      popularity: { totalOrders: -1 },
      rating:     { avgRating: -1 },
      price_asc:  { price: 1 },
      price_desc: { price: -1 },
      newest:     { createdAt: -1 }
    }
    const sort = sortMap[sortBy as string] || sortMap.popularity

    const cacheKey = `foods:${JSON.stringify(query)}:${pageNum}:${limitNum}:${sortBy}`
    let cached = await cache.get(cacheKey)

    if (!cached) {
      const [foods, total] = await Promise.all([
        Food.find(query).sort(sort).skip(skip).limit(limitNum).select('-cost -reviews'),
        Food.countDocuments(query)
      ])
      cached = { foods, total }
      await setCache(cacheKey, cached, 300)
    }

    return sendPaginated(res, cached.foods, cached.total, pageNum, limitNum)
  } catch (err) { next(err) }
}

// ─── GET FOOD BY ID ────────────────────────────────────────
export const getFoodById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const cacheKey = `food:${id}`
    let food = await cache.get(cacheKey)

    if (!food) {
      food = await Food.findById(id).select('-cost')
      if (!food) throw new ApiError(404, 'Food not found')
      await setCache(cacheKey, food, 600)
    }

    return sendSuccess(res, { food })
  } catch (err) { next(err) }
}

// ─── GET FOODS BY RELIGION ─────────────────────────────────
export const getFoodsByReligion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { religion } = req.params
    const foods = await Food.find({ religion, isAvailable: true })
      .select('-cost -reviews').sort({ totalOrders: -1 })
    return sendSuccess(res, { foods, count: foods.length })
  } catch (err) { next(err) }
}

// ─── GET FOODS BY FESTIVAL ─────────────────────────────────
export const getFoodsByFestival = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { festival } = req.params
    const foods = await Food.find({ festivals: festival, isAvailable: true })
      .select('-cost -reviews').sort({ avgRating: -1 })
    return sendSuccess(res, { foods, count: foods.length })
  } catch (err) { next(err) }
}

// ─── ADD REVIEW ────────────────────────────────────────────
export const addReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { rating, comment } = req.body

    if (!rating || rating < 1 || rating > 5)
      throw new ApiError(400, 'Rating must be between 1 and 5')

    const food = await Food.findById(id)
    if (!food) throw new ApiError(404, 'Food not found')

    const alreadyReviewed = food.reviews.find(
      r => r.userId.toString() === req.user!.userId
    )
    if (alreadyReviewed) throw new ApiError(400, 'You already reviewed this food')

    food.reviews.push({ userId: req.user!.userId as any, rating, comment, createdAt: new Date() })
    await (food as any).updateRating()
    await food.save()

    await deleteCache(`food:${id}`)
    return sendSuccess(res, { avgRating: food.avgRating, totalRatings: food.totalRatings }, 'Review added', 201)
  } catch (err) { next(err) }
}

// ─── CREATE FOOD (Admin) ───────────────────────────────────
export const createFood = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const food = await Food.create(req.body)
    await deleteCache('foods:*')
    return sendSuccess(res, { food }, 'Food created', 201)
  } catch (err) { next(err) }
}

// ─── UPDATE FOOD (Admin) ───────────────────────────────────
export const updateFood = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const food = await Food.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
    if (!food) throw new ApiError(404, 'Food not found')
    await deleteCache(`food:${id}`)
    await deleteCache('foods:*')
    return sendSuccess(res, { food }, 'Food updated')
  } catch (err) { next(err) }
}

// ─── DELETE FOOD (Admin) ───────────────────────────────────
export const deleteFood = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const food = await Food.findByIdAndDelete(id)
    if (!food) throw new ApiError(404, 'Food not found')
    await deleteCache(`food:${id}`)
    await deleteCache('foods:*')
    return sendSuccess(res, null, 'Food deleted')
  } catch (err) { next(err) }
}
