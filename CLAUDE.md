# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Next.js 15 digital whiteboard application built with TypeScript, using the @boardxus/canvasx library for canvas functionality. The app allows users to create, save, and load interactive whiteboards with drawing tools, shapes, text, images, and charts. Data is persisted to MongoDB.

## Key Commands

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Database setup required - see README.md for MongoDB configuration
```

## Architecture Overview

### Core Technology Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Canvas**: @boardxus/canvasx for whiteboard functionality
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Database**: MongoDB with Mongoose ODM
- **Deployment**: Configured for Vercel

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/whiteboards/   # API routes for whiteboard CRUD
│   ├── layout.tsx         # Root layout with fonts
│   └── page.tsx           # Main homepage
├── components/            # React components
│   ├── whiteboard.tsx     # Legacy whiteboard component (complex)
│   └── whiteboard-new.tsx # Current whiteboard component
├── lib/                   # Utility libraries
│   ├── mongodb.ts         # MongoDB connection with caching
│   ├── utils.ts           # Utility functions
│   └── WhiteboardManager.ts # Canvas abstraction layer
└── models/                # Database models
    └── Whiteboard.ts      # Mongoose schema for whiteboards
```

### Canvas System Architecture

The app uses a multi-layered canvas architecture:

1. **@boardxus/canvasx**: External canvas library providing drawing capabilities
2. **WhiteboardManager**: Custom abstraction layer that:
   - Manages canvas initialization and lifecycle
   - Provides unified API for canvas operations
   - Handles object serialization/deserialization
   - Implements fallback strategies for different object types
3. **Whiteboard Components**: React components that use WhiteboardManager

### Data Flow

**Save Operation**:
1. Canvas → serialize() → JSON string
2. Generate thumbnail via toDataURL()
3. API route validates and stores in MongoDB
4. Include name, canvasData, thumbnail, timestamps

**Load Operation**:
1. Fetch from MongoDB via API
2. Parse JSON canvas data
3. WhiteboardManager.deserialize() recreates objects
4. Multiple rendering attempts ensure visibility

### Object Type Mapping

The canvas supports multiple object types with fallbacks:
- **XShape/rect**: Rectangles with customizable fill/stroke
- **circle**: Circles with radius and styling
- **XText/text/i-text**: Text objects with font properties
- **XPath/line/connector**: Lines and connectors between points
- **path**: Free-drawing paths (complex deserialization)
- **Image**: File uploads with scaling

## Important Implementation Details

### Canvas Initialization
- Dynamic import of @boardxus/canvasx to avoid SSR issues
- Multiple constructor fallbacks (Canvas, XCanvas, StaticCanvas)
- Brush initialization for free drawing mode
- Event handler setup for interactive features

### Serialization Challenges
- Canvas objects use mixed type systems (objType vs type)
- Manual object recreation required for reliable loading
- Multiple render attempts needed for visibility
- Fallback strategies for unsupported object types

### MongoDB Integration
- Connection caching to avoid repeated connections
- Thumbnail storage as base64 strings
- Validation of JSON canvas data before storage
- Proper error handling and logging

### State Management
The whiteboard uses React hooks for:
- Canvas initialization state
- Drawing/connector mode toggles
- Dialog visibility (save/load/text input)
- File input handling for images

## Environment Setup

Required environment variables in `.env.local`:
```
MONGODB_URI=mongodb://localhost:27017/whiteboard-app
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/whiteboard-app
```

## Common Development Patterns

### Adding New Canvas Objects
1. Update CanvasObject interface in WhiteboardManager.ts
2. Add creation method in WhiteboardManager class
3. Update recreateObject() method for deserialization
4. Add UI button in whiteboard component

### API Route Pattern
- Use NextResponse for consistent JSON responses
- Include detailed console.log for debugging
- Validate input data thoroughly
- Handle MongoDB connection errors gracefully

### Canvas Event Handling
- Use canvas.on() for mouse/keyboard events
- Store event listeners in component state
- Clean up listeners in useEffect cleanup

## Debugging Canvas Issues

Common canvas problems and solutions:
- **Objects not visible**: Multiple render attempts, check coordinates
- **Serialization fails**: Verify toJSON method availability
- **Loading incomplete**: Check object type mapping and constructors
- **Performance issues**: Canvas object count, rendering frequency

The codebase includes extensive logging for canvas operations - check browser console for detailed debugging information.