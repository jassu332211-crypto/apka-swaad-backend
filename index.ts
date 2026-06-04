import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger'

let io: Server

export const initializeSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'https://apkaswaad.in',
        'https://www.apkaswaad.in'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  // Auth middleware for socket
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
      ;(socket as any).userId = decoded.userId
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId
    logger.info(`Socket connected: ${socket.id} (user: ${userId})`)

    // Join user's personal room
    socket.join(`user:${userId}`)

    // Join order tracking room
    socket.on('track:order', (orderId: string) => {
      socket.join(`order:${orderId}`)
      logger.info(`User ${userId} tracking order ${orderId}`)
    })

    socket.on('track:stop', (orderId: string) => {
      socket.leave(`order:${orderId}`)
    })

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`)
    })
  })

  return io
}

// ─── Emit helpers (called from controllers) ────────────────
export const emitOrderUpdate = (orderId: string, data: object) => {
  if (!io) return
  io.to(`order:${orderId}`).emit('order:update', data)
}

export const emitToUser = (userId: string, event: string, data: object) => {
  if (!io) return
  io.to(`user:${userId}`).emit(event, data)
}

export const emitDeliveryLocation = (orderId: string, location: { lat: number; lng: number }) => {
  if (!io) return
  io.to(`order:${orderId}`).emit('delivery:location', location)
}

export { io }
