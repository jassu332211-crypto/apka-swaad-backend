import { Request, Response, NextFunction } from 'express'
import { Festival } from '../models/Festival'
import { Food }     from '../models/Food'
import { ApiError, sendSuccess } from '../utils/apiResponse'
import { cache, setCache } from '../utils/cache'

// ─── GET ALL FESTIVALS ─────────────────────────────────────
export const getFestivals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { religion, month } = req.query
    const query: any = { isActive: true }
    if (religion) query.religion = religion
    if (month)    query.month    = Number(month)

    const cacheKey = `festivals:${religion}:${month}`
    let festivals  = await cache.get(cacheKey)

    if (!festivals) {
      festivals = await Festival.find(query)
        .populate('foods', 'name price image isVeg')
        .sort({ month: 1 })
      await setCache(cacheKey, festivals, 3600) // 1 hour cache
    }

    return sendSuccess(res, { festivals, count: festivals.length })
  } catch (err) { next(err) }
}

// ─── GET FESTIVAL BY ID ────────────────────────────────────
export const getFestivalById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const festival = await Festival.findById(req.params.id)
      .populate('foods', 'name price image isVeg avgRating freeItems')
    if (!festival) throw new ApiError(404, 'Festival not found')
    return sendSuccess(res, { festival })
  } catch (err) { next(err) }
}

// ─── GET CURRENT / UPCOMING FESTIVALS ─────────────────────
export const getUpcomingFestivals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now   = new Date()
    const month = now.getMonth() + 1

    // Current month + next 2 months
    const months = [month, (month % 12) + 1, ((month + 1) % 12) + 1]

    const festivals = await Festival.find({
      isActive: true,
      month:    { $in: months }
    })
    .populate('foods', 'name price image isVeg')
    .sort({ month: 1 })
    .limit(10)

    return sendSuccess(res, { festivals })
  } catch (err) { next(err) }
}

// ─── CREATE FESTIVAL (Admin) ───────────────────────────────
export const createFestival = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const festival = await Festival.create(req.body)
    return sendSuccess(res, { festival }, 'Festival created', 201)
  } catch (err) { next(err) }
}

// ─── UPDATE FESTIVAL (Admin) ───────────────────────────────
export const updateFestival = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const festival = await Festival.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!festival) throw new ApiError(404, 'Festival not found')
    return sendSuccess(res, { festival }, 'Festival updated')
  } catch (err) { next(err) }
}
