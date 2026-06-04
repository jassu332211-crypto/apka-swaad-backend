import 'dotenv/config'
import { createServer } from 'http'
import app                  from './app'
import { connectDatabase }  from './config/database'
import { initializeSocket } from './socket'
import { logger }           from './utils/logger'

const PORT = Number(process.env.PORT) || 5000

async function startServer() {
  try {
    // Connect MongoDB
    await connectDatabase()

    // Create HTTP server
    const server = createServer(app)

    // Attach Socket.io
    initializeSocket(server)
    logger.info('✅ Socket.io initialized')

    // Start listening
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${PORT}`)
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`📡 Health check: http://localhost:${PORT}/health`)
    })

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`)
      server.close(() => {
        logger.info('HTTP server closed')
        process.exit(0)
      })
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT',  () => shutdown('SIGINT'))

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection:', reason)
    })

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err)
      process.exit(1)
    })

  } catch (err) {
    logger.error('Failed to start server:', err)
    process.exit(1)
  }
}

startServer()
