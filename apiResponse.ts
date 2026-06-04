import { Response } from 'express'

// ─── Custom Error Class ────────────────────────────────────
export class ApiError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }
}

// ─── Success Response ──────────────────────────────────────
export const sendSuccess = (
  res: Response,
  data: any,
  message = 'Success',
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  })
}

// ─── Error Response ────────────────────────────────────────
export const sendError = (
  res: Response,
  message = 'Something went wrong',
  statusCode = 500,
  errors?: any
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errors || null,
    timestamp: new Date().toISOString()
  })
}

// ─── Paginated Response ────────────────────────────────────
export const sendPaginated = (
  res: Response,
  data: any[],
  total: number,
  page: number,
  limit: number,
  message = 'Success'
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    },
    timestamp: new Date().toISOString()
  })
}
