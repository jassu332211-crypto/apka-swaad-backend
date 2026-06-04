import { Request, Response, NextFunction } from 'express'
import { User } from '../models/User'
import { Order } from '../models/Order'
import { ApiError, sendSuccess } from '../utils/apiResponse'
import { AuthRequest } from '../middleware/auth'
import { logger } from '../utils/logger'
import { v4 as uuid } from 'uuid'

// Reward tiers
const REWARDS = {
  netflix:     { points: 5000, label: 'Netflix 1 Month',      value: '₹199' },
  amazonPrime: { points: 3000, label: 'Amazon Prime 3 Months', value: '₹459' },
  spotify:     { points: 2000, label: 'Spotify Premium 1 Month', value: '₹119' },
  movieTicket: { points: 1000, label: 'Movie Ticket',          value: '₹250' },
  freeDelivery:{ points: 200,  label: '10 Free Deliveries',    value: '₹200' },
  discount50:  { points: 500,  label: '₹50 Off Next Order',    value: '₹50'  }
}

// ─── GET LOYALTY DASHBOARD ─────────────────────────────────
export const getLoyaltyDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.userId)
      .select('loyaltyPoints totalOrders totalSpent consecutiveDays subscriptions movieTickets')
    if (!user) throw new ApiError(404, 'User not found')

    // Calculate tier
    const tier =
      user.loyaltyPoints >= 10000 ? 'Diamond' :
      user.loyaltyPoints >= 5000  ? 'Gold'    :
      user.loyaltyPoints >= 1000  ? 'Silver'  : 'Bronze'

    // Points to next tier
    const nextTierPoints =
      tier === 'Bronze'  ? 1000  :
      tier === 'Silver'  ? 5000  :
      tier === 'Gold'    ? 10000 : null

    return sendSuccess(res, {
      points:          user.loyaltyPoints,
      tier,
      nextTierPoints,
      pointsToNext:    nextTierPoints ? nextTierPoints - user.loyaltyPoints : 0,
      totalOrders:     user.totalOrders,
      totalSpent:      user.totalSpent,
      consecutiveDays: user.consecutiveDays,
      subscriptions:   user.subscriptions,
      movieTickets:    user.movieTickets.filter(t => !t.used),
      availableRewards: Object.entries(REWARDS).map(([key, r]) => ({
        id:          key,
        label:       r.label,
        value:       r.value,
        pointsNeeded: r.points,
        canRedeem:   user.loyaltyPoints >= r.points
      }))
    })
  } catch (err) { next(err) }
}

// ─── REDEEM REWARD ─────────────────────────────────────────
export const redeemReward = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { rewardId } = req.body
    const reward = REWARDS[rewardId as keyof typeof REWARDS]
    if (!reward) throw new ApiError(400, 'Invalid reward ID')

    const user = await User.findById(req.user!.userId)
    if (!user) throw new ApiError(404, 'User not found')

    if (user.loyaltyPoints < reward.points)
      throw new ApiError(400, `Insufficient points. Need ${reward.points}, have ${user.loyaltyPoints}`)

    // Deduct points
    user.loyaltyPoints -= reward.points

    // Grant reward
    const code = uuid().slice(0, 8).toUpperCase()
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    switch (rewardId) {
      case 'netflix':
        user.subscriptions.netflix = { active: true, endDate, code }
        break
      case 'amazonPrime':
        user.subscriptions.amazonPrime = { active: true, endDate, code }
        break
      case 'spotify':
        user.subscriptions.spotify = { active: true, endDate, code }
        break
      case 'movieTicket':
        user.movieTickets.push({
          ticketId:    `TKT-${code}`,
          cinemaName:  'PVR / INOX',
          movieName:   'Any Movie',
          isValidUntil: endDate,
          used:        false,
          qrCode:      `QR-${code}`
        } as any)
        break
    }

    await user.save()
    logger.info(`Reward redeemed: ${rewardId} by user ${user.email}`)

    return sendSuccess(res, {
      reward:        reward.label,
      value:         reward.value,
      code,
      pointsDeducted: reward.points,
      pointsRemaining: user.loyaltyPoints,
      validUntil:    endDate
    }, `🎉 ${reward.label} redeemed successfully!`)
  } catch (err) { next(err) }
}

// ─── GET POINTS HISTORY ────────────────────────────────────
export const getPointsHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await Order.find({
      userId:        req.user!.userId,
      paymentStatus: 'success'
    })
    .select('orderNumber total loyaltyPointsEarned loyaltyPointsUsed createdAt deliveryStatus')
    .sort({ createdAt: -1 })
    .limit(50)

    const history = orders.map(o => ({
      orderNumber:  o.orderNumber,
      date:         o.createdAt,
      earned:       o.loyaltyPointsEarned,
      used:         o.loyaltyPointsUsed,
      net:          o.loyaltyPointsEarned - o.loyaltyPointsUsed,
      orderTotal:   o.total,
      status:       o.deliveryStatus
    }))

    return sendSuccess(res, { history })
  } catch (err) { next(err) }
}

// ─── STREAK BONUS ──────────────────────────────────────────
export const checkStreakBonus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.userId)
      .select('consecutiveDays loyaltyPoints lastOrderDate')
    if (!user) throw new ApiError(404, 'User not found')

    const streakBonuses: Record<number, number> = {
      3: 50, 5: 100, 7: 200, 10: 500, 30: 2000
    }

    const bonus = streakBonuses[user.consecutiveDays] || 0

    return sendSuccess(res, {
      consecutiveDays: user.consecutiveDays,
      bonusPoints:     bonus,
      message:         bonus > 0
        ? `🔥 ${user.consecutiveDays}-day streak! +${bonus} bonus points!`
        : `Keep ordering to unlock streak bonuses!`
    })
  } catch (err) { next(err) }
}
