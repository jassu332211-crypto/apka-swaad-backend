import { Router } from 'express'
import {
  getLoyaltyDashboard, redeemReward,
  getPointsHistory, checkStreakBonus
} from '../controllers/loyaltyController'
import { protect } from '../middleware/auth'

const router = Router()

router.use(protect)

router.get ('/dashboard', getLoyaltyDashboard)
router.get ('/history',   getPointsHistory)
router.get ('/streak',    checkStreakBonus)
router.post('/redeem',    redeemReward)

export default router
