import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/apiResponse'
import { logger } from '../utils/logger'

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500
  let message    = err.message    || 'Internal Server Error'

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400
    const errors = Object.values(err.errors).map((e: any) => e.message)
    message = errors.join(', ')
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409
    const field = Object.keys(err.keyValue)[0]
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400
    message = `Invalid ${err.path}: ${err.value}`
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid token' }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Token expired' }

  // Log server errors
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.path} - ${statusCode}: ${message}`, err)
  }

  res.status(statusCode).json({
    success:   false,
    message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}
