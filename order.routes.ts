import { Router } from 'express'
import {
  placeOrder, getMyOrders, getOrderById,
  trackOrder, cancelOrder, rateOrder, updateOrderStatus
} from '../controllers/orderController'
import { protect, adminOnly } from '../middleware/auth'

const router = Router()

router.use(protect) // all order routes require login

router.post('/',               placeOrder)
router.get ('/',               getMyOrders)
router.get ('/:id',            getOrderById)
router.get ('/:id/track',      trackOrder)
router.post('/:id/cancel',     cancelOrder)
router.post('/:id/rate',       rateOrder)

// Admin
router.patch('/:id/status', adminOnly, updateOrderStatus)

export default router
