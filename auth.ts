import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { ApiError } from '../utils/apiResponse'
import { User } from '../models/User'

export interface AuthRequest extends Request {
  user?: { userId: string; role: string }
}

// ─── Protect Route (must be logged in) ────────────────────
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided. Please login.')
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string
      role: string
    }

    // Check user still exists and is active
    const user = await User.findById(decoded.userId).select('isActive role')
    if (!user || !user.isActive) {
      throw new ApiError(401, 'User not found or deactivated')
    }

    req.user = { userId: decoded.userId, role: user.role }
    next()
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError')  return next(new ApiError(401, 'Invalid token'))
    if (err.name === 'TokenExpiredError')  return next(new ApiError(401, 'Token expired. Please login again.'))
    next(err)
  }
}

// ─── Admin Only ────────────────────────────────────────────
export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'))
  }
  next()
}
