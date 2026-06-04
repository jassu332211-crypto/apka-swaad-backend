import { Router } from 'express'
import {
  getFestivals, getFestivalById,
  getUpcomingFestivals, createFestival, updateFestival
} from '../controllers/festivalController'
import { protect, adminOnly } from '../middleware/auth'

const router = Router()

router.get('/',            getFestivals)
router.get('/upcoming',    getUpcomingFestivals)
router.get('/:id',         getFestivalById)

router.post('/',     protect, adminOnly, createFestival)
router.put ('/:id',  protect, adminOnly, updateFestival)

export default router
