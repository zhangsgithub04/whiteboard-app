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
  console.log('POST /api/whiteboards - Starting save operation')
  
  try {
    const requestData = await request.json()
    const { name, canvasData, thumbnail } = requestData

    console.log('Request data received:', {
      name,
      canvasDataType: typeof canvasData,
      canvasDataLength: canvasData?.length || 0,
      thumbnailLength: thumbnail?.length || 0,
      hasName: !!name,
      hasCanvasData: !!canvasData
    })

    if (!name || !canvasData) {
      console.error('Validation failed:', { name: !!name, canvasData: !!canvasData })
      return NextResponse.json(
        { error: 'Name and canvas data are required' },
        { status: 400 }
      )
    }

    // Validate that canvasData is valid JSON if it's a string
    if (typeof canvasData === 'string') {
      try {
        JSON.parse(canvasData)
        console.log('Canvas data is valid JSON string')
      } catch (jsonError) {
        console.error('Canvas data is not valid JSON:', jsonError)
        return NextResponse.json(
          { error: 'Canvas data must be valid JSON' },
          { status: 400 }
        )
      }
    } else {
      console.log('Canvas data is not a string, type:', typeof canvasData)
    }

    console.log('Attempting to connect to MongoDB...')
    await connectDB()
    console.log('MongoDB connected successfully')
    
    console.log('Creating whiteboard document...')
    const whiteboard = new Whiteboard({
      name,
      canvasData,
      thumbnail
    })

    console.log('Saving whiteboard to database...')
    await whiteboard.save()
    console.log('Whiteboard saved successfully with ID:', whiteboard._id)

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