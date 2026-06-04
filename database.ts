import mongoose from 'mongoose'
import { logger } from '../utils/logger'

export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables')
  }

  mongoose.set('strictQuery', false)

  mongoose.connection.on('connected', () => {
    logger.info('✅ MongoDB connected successfully')
  })

  mongoose.connection.on('error', (err) => {
    logger.error('❌ MongoDB connection error:', err)
  })

  mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️  MongoDB disconnected')
  })

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await mongoose.connection.close()
    logger.info('MongoDB connection closed on app termination')
    process.exit(0)
  })

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
}
