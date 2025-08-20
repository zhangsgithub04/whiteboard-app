import Whiteboard from "../components/whiteboard-new";

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-center">Digital Whiteboard</h1>
        <p className="text-center text-gray-600 mt-2">
          Collaborative whiteboard powered by CanvasX
        </p>
      </header>
      
      <main className="flex justify-center">
        <Whiteboard 
          width={1000} 
          height={700} 
          className="max-w-full"
        />
      </main>
    </div>
  );
}
