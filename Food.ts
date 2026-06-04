import mongoose, { Document, Schema } from 'mongoose'

export interface IFreeItem {
  name: string
  quantity: string
}

export interface IReview {
  userId: mongoose.Types.ObjectId
  rating: number
  comment: string
  createdAt: Date
}

export interface IFood extends Document {
  name: string
  nameHindi: string
  shortDescription: string
  description: string
  category: 'Main Course' | 'Starter' | 'Dessert' | 'Drink' | 'Snack' | 'Thali'
  religion: 'Muslim' | 'Hindu' | 'Sikh' | 'Christian' | 'Jain' | 'Buddhist' | 'Parsi' | 'All'
  festivals: string[]
  price: number
  cost: number
  freeItems: IFreeItem[]
  image: string
  images: string[]
  modelPath?: string
  isVeg: boolean
  isAvailable: boolean
  prepTime: number
  calories?: number
  allergens: string[]
  ingredients: string[]
  avgRating: number
  totalRatings: number
  totalOrders: number
  reviews: IReview[]
  tags: string[]
  isSpicy: boolean
  spiceLevel: 0 | 1 | 2 | 3
  createdAt: Date
  updatedAt: Date
}

const ReviewSchema = new Schema<IReview>({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating:    { type: Number, min: 1, max: 5, required: true },
  comment:   { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
})

const FoodSchema = new Schema<IFood>({
  name:             { type: String, required: true, trim: true },
  nameHindi:        { type: String, trim: true },
  shortDescription: { type: String, required: true },
  description:      { type: String, required: true },
  category: {
    type: String,
    enum: ['Main Course','Starter','Dessert','Drink','Snack','Thali'],
    required: true
  },
  religion: {
    type: String,
    enum: ['Muslim','Hindu','Sikh','Christian','Jain','Buddhist','Parsi','All'],
    required: true
  },
  festivals:    [{ type: String }],
  price:        { type: Number, required: true, min: 0 },
  cost:         { type: Number, required: true, select: false },
  freeItems:    [{ name: String, quantity: String }],
  image:        { type: String, default: '' },
  images:       [String],
  modelPath:    String,
  isVeg:        { type: Boolean, default: true },
  isAvailable:  { type: Boolean, default: true },
  prepTime:     { type: Number, default: 15 },
  calories:     Number,
  allergens:    [String],
  ingredients:  [String],
  avgRating:    { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  totalOrders:  { type: Number, default: 0 },
  reviews:      [ReviewSchema],
  tags:         [String],
  isSpicy:      { type: Boolean, default: false },
  spiceLevel:   { type: Number, enum: [0, 1, 2, 3], default: 0 }
}, { timestamps: true })

// Auto-calculate avgRating
FoodSchema.methods.updateRating = async function () {
  if (this.reviews.length === 0) { this.avgRating = 0; return }
  const sum = this.reviews.reduce((acc: number, r: IReview) => acc + r.rating, 0)
  this.avgRating = parseFloat((sum / this.reviews.length).toFixed(1))
  this.totalRatings = this.reviews.length
}

FoodSchema.index({ religion: 1, isAvailable: 1 })
FoodSchema.index({ festivals: 1 })
FoodSchema.index({ category: 1 })
FoodSchema.index({ name: 'text', shortDescription: 'text' })

export const Food = mongoose.model<IFood>('Food', FoodSchema)
