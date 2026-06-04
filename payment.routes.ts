import { Router } from 'express'
import {
  createRazorpayOrder, verifyPayment,
  paymentWebhook, confirmCOD
} from '../controllers/paymentController'
import { protect } from '../middleware/auth'

const router = Router()

router.post('/create-order', protect, createRazorpayOrder)
router.post('/verify',       protect, verifyPayment)
router.post('/confirm-cod',  protect, confirmCOD)
router.post('/webhook',      paymentWebhook) // Razorpay calls this directly

export default router
