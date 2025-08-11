# Digital Whiteboard App

This is a React Next.js project with shadcn/ui that features a digital whiteboard canvas using [@boardxus/canvasx](https://www.npmjs.com/package/@boardxus/canvasx).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Digital Whiteboard**: Interactive canvas powered by CanvasX
- **Drawing Tools**: Freehand drawing with customizable brush (press Esc to exit drawing mode)
- **Shapes**: Add rectangles and circles to the canvas
- **Text**: Add text elements with custom styling
- **Images**: Upload and display images on the canvas
- **Charts**: Add sample chart visualizations
- **Save/Load**: Save whiteboards to MongoDB and load from a list
- **Selection Mode**: Select and manipulate objects on the canvas
- **Clear Canvas**: Reset the whiteboard to start fresh
- **Responsive Design**: Built with Tailwind CSS and shadcn/ui components

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI components
- **@boardxus/canvasx** - Canvas library for whiteboard functionality
- **MongoDB** - Database for storing whiteboard data
- **Mongoose** - MongoDB object modeling

## MongoDB Setup

This app requires MongoDB to save and load whiteboards.

### Option 1: Local MongoDB (Recommended for development)

1. Install MongoDB locally
2. Start MongoDB service
3. Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb://localhost:27017/whiteboard-app
```

### Option 2: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whiteboard-app
```

### Environment Variables

Copy `.env.example` to `.env.local` and update the `MONGODB_URI` with your MongoDB connection string.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
