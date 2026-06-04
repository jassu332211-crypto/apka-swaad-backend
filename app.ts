import express, { Application, Request, Response } from 'express'
import cors        from 'cors'
import helmet     from 'helmet'
import morgan     from 'morgan'
import rateLimit  from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize'
import hpp        from 'hpp'

import { errorHandler } from './middleware/error'
import { logger }       from './utils/logger'

import authRoutes     from './routes/auth.routes'
import foodRoutes     from './routes/food.routes'
import orderRoutes    from './routes/order.routes'
import paymentRoutes  from './routes/payment.routes'
import loyaltyRoutes  from './routes/loyalty.routes'
import festivalRoutes from './routes/festival.routes'

const app: Application = express()

// ─── Security Headers ──────────────────────────────────────
app.use(helmet())

// ─── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:5500',
      'https://apkaswaad.in',
      'https://www.apkaswaad.in'
    ]
    if (!origin || allowed.includes(origin)) return callback(null, true)
    callback(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
}))

// ─── Rate Limiting ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      200,
  message:  { success: false, message: 'Too many requests. Please try after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: 'Too many login attempts. Try after 15 minutes.' }
})

app.use('/api/', limiter)

// ─── Body Parsing ──────────────────────────────────────────
// Raw body for Razorpay webhook signature verification
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ─── Data Sanitization ─────────────────────────────────────
app.use(mongoSanitize())
app.use(hpp())

// ─── Logging ───────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg: string) => logger.info(msg.trim()) }
  }))
}

// ─── Health Check ──────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status:      'OK',
    app:         'Apka Swaad API',
    version:     '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString()
  })
})

// ─── API Routes ────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRoutes)
app.use('/api/foods',     foodRoutes)
app.use('/api/orders',    orderRoutes)
app.use('/api/payment',   paymentRoutes)
app.use('/api/loyalty',   loyaltyRoutes)
app.use('/api/festivals', festivalRoutes)

// ─── Root ──────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name:        'Apka Swaad API 🍽️',
    version:     '1.0.0',
    description: 'Festival Food Cultural Exchange Platform',
    endpoints: {
      health:    '/health',
      auth:      '/api/auth',
      foods:     '/api/foods',
      orders:    '/api/orders',
      payment:   '/api/payment',
      loyalty:   '/api/loyalty',
      festivals: '/api/festivals'
    }
  })
})

// ─── 404 ───────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` })
})

// ─── Global Error Handler ──────────────────────────────────
app.use(errorHandler)

export default app
