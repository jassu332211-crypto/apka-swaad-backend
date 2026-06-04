import { Router } from 'express'
import {
  getFoods, getFoodById, getFoodsByReligion,
  getFoodsByFestival, addReview,
  createFood, updateFood, deleteFood
} from '../controllers/foodController'
import { protect, adminOnly } from '../middleware/auth'

const router = Router()

// Public
router.get('/',                    getFoods)
router.get('/:id',                 getFoodById)
router.get('/religion/:religion',  getFoodsByReligion)
router.get('/festival/:festival',  getFoodsByFestival)

// Protected
router.post('/:id/review', protect, addReview)

// Admin only
router.post  ('/',    protect, adminOnly, createFood)
router.put   ('/:id', protect, adminOnly, updateFood)
router.delete('/:id', protect, adminOnly, deleteFood)

export default router
