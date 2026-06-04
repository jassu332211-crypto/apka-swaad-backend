// ─── routes/auth.routes.ts ─────────────────────────────────
import { Router } from 'express'
import {
  register, login, getProfile, updateProfile,
  addAddress, refreshToken, logout
} from '../controllers/authController'
import { protect } from '../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login',    login)
router.post('/refresh',  refreshToken)
router.post('/logout',   protect, logout)

router.get ('/profile',  protect, getProfile)
router.put ('/profile',  protect, updateProfile)
router.post('/address',  protect, addAddress)

export default router
