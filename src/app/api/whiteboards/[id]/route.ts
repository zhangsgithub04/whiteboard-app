import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Whiteboard from '@/models/Whiteboard'

// GET - Get specific whiteboard by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await connectDB()
    const whiteboard = await Whiteboard.findById(id)

    if (!whiteboard) {
      return NextResponse.json(
        { error: 'Whiteboard not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ whiteboard })
  } catch (error) {
    console.error('Error fetching whiteboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch whiteboard' },
      { status: 500 }
    )
  }
}

// PUT - Update whiteboard
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { name, canvasData, thumbnail } = await request.json()

    if (!name || !canvasData) {
      return NextResponse.json(
        { error: 'Name and canvas data are required' },
        { status: 400 }
      )
    }

    await connectDB()
    
    const whiteboard = await Whiteboard.findByIdAndUpdate(
      id,
      { name, canvasData, thumbnail, updatedAt: new Date() },
      { new: true }
    )

    if (!whiteboard) {
      return NextResponse.json(
        { error: 'Whiteboard not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      message: 'Whiteboard updated successfully',
      whiteboard: {
        _id: whiteboard._id,
        name: whiteboard.name,
        createdAt: whiteboard.createdAt,
        updatedAt: whiteboard.updatedAt
      }
    })
  } catch (error) {
    console.error('Error updating whiteboard:', error)
    return NextResponse.json(
      { error: 'Failed to update whiteboard' },
      { status: 500 }
    )
  }
}

// DELETE - Delete whiteboard
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await connectDB()
    
    const whiteboard = await Whiteboard.findByIdAndDelete(id)

    if (!whiteboard) {
      return NextResponse.json(
        { error: 'Whiteboard not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Whiteboard deleted successfully' })
  } catch (error) {
    console.error('Error deleting whiteboard:', error)
    return NextResponse.json(
      { error: 'Failed to delete whiteboard' },
      { status: 500 }
    )
  }
}