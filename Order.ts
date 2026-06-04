import mongoose, { Document, Schema } from 'mongoose'

export interface IOrderItem {
  foodId: mongoose.Types.ObjectId
  name: string
  quantity: number
  price: number
  freeItems: Array<{ name: string; quantity: string }>
  specialInstructions?: string
}

export interface IOrder extends Document {
  orderNumber: string
  userId: mongoose.Types.ObjectId
  items: IOrderItem[]
  subtotal: number
  deliveryCharge: number
  taxes: number
  discount: number
  total: number
  loyaltyPointsEarned: number
  loyaltyPointsUsed: number
  address: {
    fullAddress: string
    landmark?: string
    latitude: number
    longitude: number
  }
  deliveryBoyId?: mongoose.Types.ObjectId
  deliveryTime: number
  promisedTime: number
  deliveryStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'on-way' | 'delivered' | 'cancelled'
  paymentId: string
  paymentMethod: 'razorpay' | 'cash' | 'upi'
  paymentStatus: 'pending' | 'success' | 'failed' | 'refunded'
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  currentLocation?: { latitude: number; longitude: number }
  estimatedArrival?: Date
  reviewed: boolean
  rating?: number
  reviewText?: string
  deliveredAt?: Date
  cancelledAt?: Date
  createdAt: Date
  updatedAt: Date
}

const OrderSchema = new Schema<IOrder>({
  orderNumber:  { type: String, unique: true },
  userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    foodId:               { type: Schema.Types.ObjectId, ref: 'Food', required: true },
    name:                 { type: String, required: true },
    quantity:             { type: Number, required: true, min: 1 },
    price:                { type: Number, required: true },
    freeItems:            [{ name: String, quantity: String }],
    specialInstructions:  String
  }],
  subtotal:         { type: Number, default: 0 },
  deliveryCharge:   { type: Number, default: 20 },
  taxes:            { type: Number, default: 0 },
  discount:         { type: Number, default: 0 },
  total:            { type: Number, required: true },
  loyaltyPointsEarned: { type: Number, default: 0 },
  loyaltyPointsUsed:   { type: Number, default: 0 },
  address: {
    fullAddress: { type: String, required: true },
    landmark:    String,
    latitude:    { type: Number, required: true },
    longitude:   { type: Number, required: true }
  },
  deliveryBoyId:  { type: Schema.Types.ObjectId, ref: 'DeliveryBoy' },
  deliveryTime:   { type: Number, default: 0 },
  promisedTime:   { type: Number, default: 5 },
  deliveryStatus: {
    type: String,
    enum: ['pending','confirmed','preparing','ready','on-way','delivered','cancelled'],
    default: 'pending'
  },
  paymentId:     { type: String, default: '' },
  paymentMethod: { type: String, enum: ['razorpay','cash','upi'], required: true },
  paymentStatus: { type: String, enum: ['pending','success','failed','refunded'], default: 'pending' },
  razorpayOrderId:   String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  currentLocation:   { latitude: Number, longitude: Number },
  estimatedArrival:  Date,
  reviewed:     { type: Boolean, default: false },
  rating:       { type: Number, min: 1, max: 5 },
  reviewText:   String,
  deliveredAt:  Date,
  cancelledAt:  Date
}, { timestamps: true })

// Auto-generate order number
OrderSchema.pre('save', function (next) {
  if (!this.isNew) return next()
  const ts  = Date.now().toString().slice(-8)
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  this.orderNumber = `AS-${ts}-${rnd}`
  next()
})

// Recalculate subtotal & total before save
OrderSchema.pre('save', function (next) {
  this.subtotal = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  this.total = this.subtotal + this.deliveryCharge + this.taxes - this.discount
  next()
})

// Set timestamps on status change
OrderSchema.pre('save', function (next) {
  if (this.deliveryStatus === 'delivered' && !this.deliveredAt) this.deliveredAt = new Date()
  if (this.deliveryStatus === 'cancelled' && !this.cancelledAt) this.cancelledAt = new Date()
  next()
})

OrderSchema.index({ userId: 1, createdAt: -1 })
OrderSchema.index({ orderNumber: 1 })
OrderSchema.index({ deliveryStatus: 1 })

export const Order = mongoose.model<IOrder>('Order', OrderSchema)
