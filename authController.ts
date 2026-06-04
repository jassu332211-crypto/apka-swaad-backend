import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'
import { ApiError, sendSuccess } from '../utils/apiResponse'
import { logger } from '../utils/logger'
import { AuthRequest } from '../middleware/auth'

// ─── Helpers ───────────────────────────────────────────────
const genAccessToken  = (userId: string, role: string) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })

const genRefreshToken = (userId: string) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' })

const userPublic = (user: any) => ({
  id:            user._id,
  name:          user.name,
  email:         user.email,
  phone:         user.phone,
  avatar:        user.avatar,
  role:          user.role,
  loyaltyPoints: user.loyaltyPoints,
  totalOrders:   user.totalOrders,
  totalSpent:    user.totalSpent,
  preferences:   user.preferences
})

// ─── REGISTER ──────────────────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, password } = req.body

    if (!name || !email || !phone || !password)
      throw new ApiError(400, 'All fields are required: name, email, phone, password')

    if (password.length < 6)
      throw new ApiError(400, 'Password must be at least 6 characters')

    const existing = await User.findOne({ $or: [{ email }, { phone }] })
    if (existing) throw new ApiError(409, 'User already exists with this email or phone')

    const user = await User.create({ name, email, phone, passwordHash: password })

    const accessToken  = genAccessToken(user._id.toString(), user.role)
    const refreshToken = genRefreshToken(user._id.toString())

    logger.info(`New user registered: ${user.email}`)

    return sendSuccess(res, {
      user: userPublic(user),
      accessToken,
      refreshToken
    }, 'Registration successful', 201)
  } catch (err) { next(err) }
}

// ─── LOGIN ─────────────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, password } = req.body

    if ((!email && !phone) || !password)
      throw new ApiError(400, 'Email/phone and password are required')

    const user = await User.findOne({
      $and: [
        { isActive: true },
        { $or: [{ email: email?.toLowerCase() }, { phone }] }
      ]
    }).select('+passwordHash')

    if (!user) throw new ApiError(401, 'Invalid credentials')

    const isValid = await user.comparePassword(password)
    if (!isValid) throw new ApiError(401, 'Invalid credentials')

    user.lastLoginAt = new Date()
    await user.save({ validateBeforeSave: false })

    const accessToken  = genAccessToken(user._id.toString(), user.role)
    const refreshToken = genRefreshToken(user._id.toString())

    logger.info(`User logged in: ${user.email}`)

    return sendSuccess(res, {
      user: userPublic(user),
      accessToken,
      refreshToken
    }, 'Login successful')
  } catch (err) { next(err) }
}

// ─── GET PROFILE ────────────────────────────────────────────
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.userId)
    if (!user) throw new ApiError(404, 'User not found')
    return sendSuccess(res, { user: userPublic(user) })
  } catch (err) { next(err) }
}

// ─── UPDATE PROFILE ─────────────────────────────────────────
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, avatar, preferences } = req.body
    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { ...(name && { name }), ...(avatar && { avatar }), ...(preferences && { preferences }) },
      { new: true, runValidators: true }
    )
    if (!user) throw new ApiError(404, 'User not found')
    return sendSuccess(res, { user: userPublic(user) }, 'Profile updated')
  } catch (err) { next(err) }
}

// ─── ADD ADDRESS ────────────────────────────────────────────
export const addAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { label, fullAddress, landmark, latitude, longitude, isDefault } = req.body
    const user = await User.findById(req.user!.userId)
    if (!user) throw new ApiError(404, 'User not found')

    if (isDefault) {
      user.addresses.forEach(a => { a.isDefault = false })
    }

    user.addresses.push({ label, fullAddress, landmark, latitude, longitude, isDefault: !!isDefault } as any)
    await user.save()

    return sendSuccess(res, { addresses: user.addresses }, 'Address added', 201)
  } catch (err) { next(err) }
}

// ─── REFRESH TOKEN ──────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: rToken } = req.body
    if (!rToken) throw new ApiError(400, 'Refresh token required')

    const decoded = jwt.verify(rToken, process.env.JWT_REFRESH_SECRET!) as { userId: string }
    const user    = await User.findById(decoded.userId).select('isActive role')
    if (!user || !user.isActive) throw new ApiError(401, 'Invalid refresh token')

    const accessToken = genAccessToken(user._id.toString(), user.role)
    return sendSuccess(res, { accessToken }, 'Token refreshed')
  } catch (err) { next(err) }
}

// ─── LOGOUT ─────────────────────────────────────────────────
export const logout = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, null, 'Logged out successfully')
  } catch (err) { next(err) }
}
