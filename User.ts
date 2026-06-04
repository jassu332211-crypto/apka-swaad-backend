import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IAddress {
  _id: mongoose.Types.ObjectId
  label: 'Home' | 'Work' | 'Other'
  fullAddress: string
  landmark?: string
  latitude: number
  longitude: number
  isDefault: boolean
  createdAt: Date
}

export interface IMovieTicket {
  _id: mongoose.Types.ObjectId
  ticketId: string
  cinemaName: string
  movieName: string
  redeemedAt: Date
  isValidUntil: Date
  used: boolean
  usedAt?: Date
  qrCode: string
}

export interface IUser extends Document {
  name: string
  email: string
  phone: string
  passwordHash: string
  avatar?: string
  role: 'user' | 'admin'
  addresses: IAddress[]
  loyaltyPoints: number
  totalOrders: number
  totalSpent: number
  consecutiveDays: number
  lastOrderDate?: Date
  subscriptions: {
    netflix?:      { active: boolean; endDate?: Date; code?: string }
    amazonPrime?:  { active: boolean; endDate?: Date; code?: string }
    spotify?:      { active: boolean; endDate?: Date; code?: string }
  }
  movieTickets: IMovieTicket[]
  preferences: {
    dietary: string[]
    favoriteReligions: string[]
    favoriteFestivals: string[]
    notifications: { email: boolean; sms: boolean; push: boolean }
  }
  isActive: boolean
  emailVerified: boolean
  phoneVerified: boolean
  lastLoginAt: Date
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const AddressSchema = new Schema<IAddress>({
  label:       { type: String, enum: ['Home', 'Work', 'Other'], required: true },
  fullAddress: { type: String, required: true },
  landmark:    String,
  latitude:    { type: Number, required: true },
  longitude:   { type: Number, required: true },
  isDefault:   { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
})

const MovieTicketSchema = new Schema<IMovieTicket>({
  ticketId:     { type: String, required: true },
  cinemaName:   String,
  movieName:    String,
  redeemedAt:   { type: Date, default: Date.now },
  isValidUntil: Date,
  used:         { type: Boolean, default: false },
  usedAt:       Date,
  qrCode:       String
})

const UserSchema = new Schema<IUser>({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  avatar:       String,
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  addresses:    [AddressSchema],
  loyaltyPoints:    { type: Number, default: 0 },
  totalOrders:      { type: Number, default: 0 },
  totalSpent:       { type: Number, default: 0 },
  consecutiveDays:  { type: Number, default: 0 },
  lastOrderDate:    Date,
  subscriptions: {
    netflix:     { active: { type: Boolean, default: false }, endDate: Date, code: String },
    amazonPrime: { active: { type: Boolean, default: false }, endDate: Date, code: String },
    spotify:     { active: { type: Boolean, default: false }, endDate: Date, code: String }
  },
  movieTickets: [MovieTicketSchema],
  preferences: {
    dietary:          [{ type: String, enum: ['Veg','Non-Veg','Vegan','Jain','Kosher','Halal'] }],
    favoriteReligions:[String],
    favoriteFestivals:[String],
    notifications: {
      email: { type: Boolean, default: true },
      sms:   { type: Boolean, default: true },
      push:  { type: Boolean, default: true }
    }
  },
  isActive:       { type: Boolean, default: true },
  emailVerified:  { type: Boolean, default: false },
  phoneVerified:  { type: Boolean, default: false },
  lastLoginAt:    { type: Date, default: Date.now }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next()
  const salt = await bcrypt.genSalt(12)
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
  next()
})

// Compare password method
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash)
}

UserSchema.index({ email: 1 })
UserSchema.index({ phone: 1 })

export const User = mongoose.model<IUser>('User', UserSchema)
