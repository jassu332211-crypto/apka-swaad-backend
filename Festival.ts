import mongoose, { Document, Schema } from 'mongoose'

export interface IFestival extends Document {
  name: string
  nameHindi: string
  religion: string
  description: string
  month: number
  startDate?: Date
  endDate?: Date
  emoji: string
  color: string
  foods: mongoose.Types.ObjectId[]
  isActive: boolean
  lat: number
  lng: number
  region: string
  specialOffer?: string
  createdAt: Date
}

const FestivalSchema = new Schema<IFestival>({
  name:        { type: String, required: true, trim: true },
  nameHindi:   { type: String, trim: true },
  religion:    { type: String, required: true },
  description: { type: String, required: true },
  month:       { type: Number, min: 1, max: 12 },
  startDate:   Date,
  endDate:     Date,
  emoji:       { type: String, default: '🎉' },
  color:       { type: String, default: '#FF6B35' },
  foods:       [{ type: Schema.Types.ObjectId, ref: 'Food' }],
  isActive:    { type: Boolean, default: true },
  lat:         { type: Number, default: 20.5937 },
  lng:         { type: Number, default: 78.9629 },
  region:      { type: String, default: 'India' },
  specialOffer: String
}, { timestamps: true })

FestivalSchema.index({ religion: 1 })
FestivalSchema.index({ month: 1 })

export const Festival = mongoose.model<IFestival>('Festival', FestivalSchema)
