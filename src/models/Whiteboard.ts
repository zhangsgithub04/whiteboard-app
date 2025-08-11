import mongoose from 'mongoose'

export interface IWhiteboard extends mongoose.Document {
  name: string
  canvasData: string // JSON string of canvas objects
  thumbnail?: string // Base64 encoded thumbnail image
  createdAt: Date
  updatedAt: Date
}

const WhiteboardSchema = new mongoose.Schema<IWhiteboard>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  canvasData: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Update the updatedAt field on save
WhiteboardSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export default mongoose.models.Whiteboard || mongoose.model<IWhiteboard>('Whiteboard', WhiteboardSchema)