import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Whiteboard from '@/models/Whiteboard'

// GET - List all whiteboards
export async function GET() {
  try {
    await connectDB()
    const whiteboards = await Whiteboard.find({})
      .select('_id name createdAt updatedAt thumbnail')
      .sort({ updatedAt: -1 })
      .limit(50)

    return NextResponse.json({ whiteboards })
  } catch (error) {
    console.error('Error fetching whiteboards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch whiteboards' },
      { status: 500 }
    )
  }
}

// POST - Create new whiteboard
export async function POST(request: Request) {
  try {
    const { name, canvasData, thumbnail } = await request.json()

    if (!name || !canvasData) {
      return NextResponse.json(
        { error: 'Name and canvas data are required' },
        { status: 400 }
      )
    }

    await connectDB()
    
    const whiteboard = new Whiteboard({
      name,
      canvasData,
      thumbnail
    })

    await whiteboard.save()

    return NextResponse.json({ 
      message: 'Whiteboard saved successfully',
      whiteboard: {
        _id: whiteboard._id,
        name: whiteboard.name,
        createdAt: whiteboard.createdAt,
        updatedAt: whiteboard.updatedAt
      }
    })
  } catch (error) {
    console.error('Error saving whiteboard:', error)
    
    // More specific error handling
    let errorMessage = 'Failed to save whiteboard'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}