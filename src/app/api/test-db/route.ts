import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'

// GET - Test database connection
export async function GET() {
  try {
    console.log('Testing database connection...')
    await connectDB()
    console.log('Database connection test successful')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Database connection test failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}