import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whiteboard-app'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

interface GlobalMongo {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var mongo: GlobalMongo | undefined
}

let cached = global.mongo

if (!cached) {
  cached = global.mongo = { conn: null, promise: null }
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached!.conn) {
    console.log('Using existing MongoDB connection')
    return cached!.conn
  }

  if (!cached!.promise) {
    console.log('Creating new MongoDB connection to:', MONGODB_URI.substring(0, 20) + '...')
    const opts = {
      bufferCommands: false,
    }

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB connected successfully')
      return mongoose
    }).catch((error) => {
      console.error('MongoDB connection failed:', error)
      throw error
    })
  }

  try {
    cached!.conn = await cached!.promise
  } catch (e) {
    console.error('Error establishing MongoDB connection:', e)
    cached!.promise = null
    throw new Error(`MongoDB connection failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
  }

  return cached!.conn
}

export default connectDB