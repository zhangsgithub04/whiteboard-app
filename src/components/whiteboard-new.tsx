'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { WhiteboardManager, CanvasObject } from '@/lib/WhiteboardManager'

interface WhiteboardProps {
  width?: number
  height?: number
  className?: string
}

export default function Whiteboard({ 
  width = 800, 
  height = 600, 
  className = '' 
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const whiteboardManager = useRef<WhiteboardManager | null>(null)
  
  // React state
  const [isCanvasReady, setIsCanvasReady] = useState(false)
  const [error, setError] = useState<string>('')
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [isConnectorMode, setIsConnectorMode] = useState(false)
  const [connectorStart, setConnectorStart] = useState<{x: number, y: number} | null>(null)
  const [whiteboardName, setWhiteboardName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [savedWhiteboards, setSavedWhiteboards] = useState<Array<{_id: string, name: string, createdAt: string, updatedAt: string, thumbnail?: string}>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadedObjects, setLoadedObjects] = useState<CanvasObject[]>([]) // State to hold loaded objects
  const [alertedObjects, setAlertedObjects] = useState<Set<number>>(new Set()) // Track which objects have been alerted
  const [showLoadingAlert, setShowLoadingAlert] = useState(false) // Show loading alert popup
  const [showDebugPanel, setShowDebugPanel] = useState(false) // Show debug data panel
  const [debugData, setDebugData] = useState<{
    rawCanvasData?: string
    parsedData?: Record<string, unknown>
    currentObjects?: CanvasObject[]
    canvasState?: Record<string, unknown>
  }>({}) // Debug data
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle connector click interactions
  const handleConnectorClick = useCallback((e: Record<string, unknown>) => {
    try {
      // Get pointer coordinates with proper fallbacks
      let pointer = { x: 0, y: 0 }
      if (e.pointer && typeof e.pointer === 'object') {
        const pointerObj = e.pointer as Record<string, unknown>
        pointer = {
          x: typeof pointerObj.x === 'number' ? pointerObj.x : 0,
          y: typeof pointerObj.y === 'number' ? pointerObj.y : 0
        }
      } else if (e.e && typeof e.e === 'object') {
        const eventObj = e.e as Record<string, unknown>
        if (eventObj.offsetX !== undefined && eventObj.offsetY !== undefined) {
          pointer = {
            x: eventObj.offsetX as number,
            y: eventObj.offsetY as number
          }
        }
      }
      
      if (!connectorStart) {
        // First click - start connector
        setConnectorStart(pointer)
        console.log('Connector start set at:', pointer.x, pointer.y)
      } else {
        // Second click - complete connector
        const manager = whiteboardManager.current
        if (manager) {
          manager.addConnector(connectorStart.x, connectorStart.y, pointer.x, pointer.y)
          console.log('Created connector from', connectorStart, 'to', pointer)
        }
        setConnectorStart(null)
        setIsConnectorMode(false)
      }
    } catch (error) {
      console.error('Error handling connector click:', error)
    }
  }, [connectorStart])

  // Set up event handlers for interactive features
  const setupEventHandlers = useCallback(() => {
    const manager = whiteboardManager.current
    if (!manager) return

    manager.addEventListener('mouse:down', (e: Record<string, unknown>) => {
      if (isConnectorMode) {
        handleConnectorClick(e)
      }
    })
  }, [isConnectorMode, handleConnectorClick])

  // Initialize whiteboard manager
  useEffect(() => {
    const initWhiteboard = async () => {
      if (canvasRef.current && !whiteboardManager.current) {
        try {
          console.log('Initializing WhiteboardManager...')
          
          const manager = new WhiteboardManager()
          whiteboardManager.current = manager
          
          // Set up event listeners
          manager.onReady(() => {
            console.log('WhiteboardManager ready')
            setIsCanvasReady(true)
            setupEventHandlers()
          })
          
          manager.onError((errorMsg) => {
            console.error('WhiteboardManager error:', errorMsg)
            setError(errorMsg)
          })
          
          // Initialize the manager
          await manager.initialize(canvasRef.current, width, height)
          
        } catch (error) {
          const errorMsg = `Failed to initialize whiteboard: ${error}`
          console.error(errorMsg)
          setError(errorMsg)
        }
      }
    }

    initWhiteboard()

    return () => {
      if (whiteboardManager.current) {
        whiteboardManager.current.dispose()
        whiteboardManager.current = null
      }
    }
  }, [width, height, setupEventHandlers])


  // Drawing mode controls
  const enableDrawing = () => {
    const manager = whiteboardManager.current
    if (manager) {
      manager.enableDrawingMode()
      setIsDrawingMode(true)
    }
  }

  const disableDrawing = () => {
    const manager = whiteboardManager.current
    if (manager) {
      manager.disableDrawingMode()
      setIsDrawingMode(false)
    }
  }

  // Handle escape key to exit drawing mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isDrawingMode) {
          disableDrawing()
        }
        if (isConnectorMode) {
          setIsConnectorMode(false)
          setConnectorStart(null)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDrawingMode, isConnectorMode])

  // Shape creation methods
  const addRectangle = () => {
    const manager = whiteboardManager.current
    if (manager) {
      manager.addRectangle()
    }
  }

  const addCircle = () => {
    const manager = whiteboardManager.current
    if (manager) {
      manager.addCircle()
    }
  }

  const showTextInputDialog = () => {
    setShowTextInput(true)
  }

  const addText = () => {
    const manager = whiteboardManager.current
    if (manager && textInput.trim()) {
      manager.addText(textInput)
      setTextInput('')
      setShowTextInput(false)
    }
  }

  const addImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const manager = whiteboardManager.current
    
    if (file && manager) {
      manager.addImage(file, (success) => {
        if (!success) {
          console.error('Failed to add image')
        }
      })
    }
    
    // Reset file input
    if (event.target) {
      event.target.value = ''
    }
  }

  const addChart = () => {
    const manager = whiteboardManager.current
    if (manager) {
      manager.addChart()
    }
  }

  // Connector mode
  const toggleConnectorMode = () => {
    if (isConnectorMode) {
      setIsConnectorMode(false)
      setConnectorStart(null)
      console.log('Connector mode disabled')
    } else {
      setIsConnectorMode(true)
      setIsDrawingMode(false)
      setConnectorStart(null)
      console.log('Connector mode enabled - click two points to create a connector')
    }
  }

  // Canvas management
  const clearCanvas = () => {
    const manager = whiteboardManager.current
    if (manager) {
      manager.clear()
      setLoadedObjects([])
      setAlertedObjects(new Set())
    }
  }

  // Function to update debug data
  const updateDebugData = (data: {
    rawCanvasData?: string
    parsedData?: Record<string, unknown>
    currentObjects?: CanvasObject[]
    canvasState?: Record<string, unknown>
  }) => {
    setDebugData(prev => ({ ...prev, ...data }))
  }

  // Function to create sample widgets for testing
  const createSampleWidgets = () => {
    const manager = whiteboardManager.current
    if (!manager) return
    
    console.log('🎨 Creating sample widgets for testing...')
    
    // Add various shapes for testing
    manager.addRectangle({ left: 100, top: 100, width: 80, height: 60, fill: 'lightblue' })
    manager.addCircle({ left: 250, top: 150, radius: 40, fill: 'lightgreen' })
    manager.addText('Sample Text', { left: 400, top: 100, fill: 'purple' })
    manager.addRectangle({ left: 150, top: 300, width: 100, height: 50, fill: 'orange' })
    manager.addConnector(300, 250, 450, 300)
    
    // Update debug data with current objects
    const currentObjects = manager.getObjects()
    updateDebugData({ currentObjects })
    
    console.log('✅ Sample widgets created!')
  }

  // Function to test loading with mock Fabric.js data
  const testFabricJsLoading = async () => {
    const manager = whiteboardManager.current
    if (!manager) return

    console.log('🧪 Testing Fabric.js object loading...')
    
    const mockFabricData = JSON.stringify({
      version: "0.0.48",
      objects: [
        {
          type: "Rect",
          left: 50,
          top: 50,
          width: 100,
          height: 100,
          fill: "lightcoral",
          stroke: "#000000",
          strokeWidth: 2
        },
        {
          type: "Circle", 
          left: 200,
          top: 50,
          radius: 50,
          fill: "lightblue",
          stroke: "#000000",
          strokeWidth: 2
        }
      ],
      background: "#ffffff"
    })

    // Clear canvas first
    manager.clear()
    
    // Test deserialization
    const success = await manager.deserialize(mockFabricData)
    
    if (success) {
      const objects = manager.getObjects()
      updateDebugData({ 
        currentObjects: objects,
        rawCanvasData: mockFabricData,
        parsedData: JSON.parse(mockFabricData),
        canvasState: {
          testResult: 'SUCCESS',
          objectsLoaded: objects.length
        }
      })
      alert(`✅ Test successful! Loaded ${objects.length} Fabric.js objects`)
      setShowDebugPanel(true)
    } else {
      updateDebugData({
        canvasState: {
          testResult: 'FAILED',
          objectsLoaded: 0
        }
      })
      alert('❌ Test failed - check debug panel')
      setShowDebugPanel(true)
    }
  }

  // Save/Load operations
  const saveWhiteboard = async () => {
    const manager = whiteboardManager.current
    if (!manager || !whiteboardName.trim()) {
      alert('Please enter a name for the whiteboard')
      return
    }

    setIsLoading(true)
    console.log('Starting save operation for:', whiteboardName)
    
    try {
      // Serialize canvas data
      const canvasData = await manager.serialize()
      
      // Generate thumbnail
      const thumbnail = manager.generateThumbnail()
      
      // Update debug data with save information
      const currentObjects = manager.getObjects()
      let parsedCanvasData = null
      try {
        parsedCanvasData = JSON.parse(canvasData)
      } catch (e) {
        console.error('Failed to parse canvas data for debug:', e)
      }
      
      updateDebugData({
        rawCanvasData: canvasData,
        parsedData: parsedCanvasData,
        currentObjects,
        canvasState: {
          isReady: manager.getIsReady(),
          objectCountBeforeSave: manager.getObjectCount(),
          serializationSuccessful: true
        }
      })
      
      console.log('Preparing to save:', {
        name: whiteboardName,
        canvasDataLength: canvasData.length,
        thumbnailLength: thumbnail.length,
        objectCount: manager.getObjectCount()
      })

      const response = await fetch('/api/whiteboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: whiteboardName,
          canvasData,
          thumbnail
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Save successful:', result)
        alert('Whiteboard saved successfully!')
        setWhiteboardName('')
        setShowSaveDialog(false)
        if (showLoadDialog) {
          loadWhiteboardsList()
        }
      } else {
        let errorMessage = 'Unknown error'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`
          console.error('API error response:', errorData)
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        
        console.error('Save failed with status:', response.status, errorMessage)
        alert(`Failed to save whiteboard: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Save error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to save whiteboard: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const loadWhiteboardsList = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/whiteboards')
      if (response.ok) {
        const data = await response.json()
        setSavedWhiteboards(data.whiteboards || [])
      } else {
        console.error('Failed to load whiteboards list')
        setSavedWhiteboards([])
      }
    } catch (error) {
      console.error('Load list error:', error)
      setSavedWhiteboards([])
    } finally {
      setIsLoading(false)
    }
  }

  // Function to alert/highlight widgets with animation
  const alertWidgets = async (objects: CanvasObject[]) => {
    setShowLoadingAlert(true)
    setAlertedObjects(new Set())
    
    console.log(`🚨 Alerting ${objects.length} widgets...`)
    
    // Alert each widget with a delay for visual effect
    for (let i = 0; i < objects.length; i++) {
      await new Promise(resolve => {
        setTimeout(() => {
          setAlertedObjects(prev => new Set([...prev, i]))
          console.log(`🎯 Widget ${i + 1} alerted: ${objects[i].type}`)
          resolve(undefined)
        }, 300 * i) // 300ms delay between each alert
      })
    }
    
    // Hide loading alert after all widgets are alerted
    setTimeout(() => {
      setShowLoadingAlert(false)
      console.log('✅ All widgets have been alerted!')
    }, 300 * objects.length + 1000) // Extra second to show completion
  }

  const loadWhiteboard = async (id: string) => {
    const manager = whiteboardManager.current
    if (!manager) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/whiteboards/${id}`)
      if (response.ok) {
        const data = await response.json()
        
        console.log('Loading whiteboard:', data.whiteboard.name)
        
        if (data.whiteboard.canvasData) {
          // Update debug data with raw canvas data
          const rawCanvasData = data.whiteboard.canvasData
          let parsedData = null
          try {
            parsedData = typeof rawCanvasData === 'string' ? JSON.parse(rawCanvasData) : rawCanvasData
          } catch (e) {
            console.error('Failed to parse canvas data for debug:', e)
          }
          
          updateDebugData({ 
            rawCanvasData: JSON.stringify(rawCanvasData, null, 2),
            parsedData,
            canvasState: {
              isReady: manager.getIsReady(),
              objectCountBefore: manager.getObjectCount()
            }
          })
          
          const success = await manager.deserialize(data.whiteboard.canvasData)
          
          if (success) {
            console.log('Whiteboard loaded successfully')
            setShowLoadDialog(false)
            
            // Get loaded objects
            const objects = manager.getObjects ? manager.getObjects() : []
            setLoadedObjects(objects)
            
            // Update debug data with final state
            updateDebugData({ 
              currentObjects: objects,
              canvasState: {
                isReady: manager.getIsReady(),
                objectCountAfter: manager.getObjectCount(),
                actualObjectsFound: objects.length
              }
            })
            
            if (objects.length > 0) {
              // Alert all loaded widgets
              await alertWidgets(objects)
              alert(`✅ Loaded: ${data.whiteboard.name}\n🎯 ${objects.length} widgets loaded and alerted!`)
            } else {
              alert(`⚠️ Loaded: ${data.whiteboard.name}\n❗ No widgets found - check debug panel for details`)
              setShowDebugPanel(true) // Auto-show debug panel when no widgets found
            }
          } else {
            alert('Failed to load whiteboard data - check debug panel for details')
            setShowDebugPanel(true)
          }
        } else {
          alert('No canvas data found in whiteboard')
        }
      } else {
        const error = await response.json()
        alert(`Failed to load: ${error.error}`)
      }
    } catch (error) {
      console.error('Load error:', error)
      alert('Failed to load whiteboard')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteWhiteboard = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/whiteboards/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Whiteboard deleted successfully!')
        loadWhiteboardsList()
      } else {
        const error = await response.json()
        alert(`Failed to delete: ${error.error}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete whiteboard')
    } finally {
      setIsLoading(false)
    }
  }

  const showSaveDialog_handler = () => {
    setShowSaveDialog(true)
  }

  const showLoadDialog_handler = () => {
    setShowLoadDialog(true)
    loadWhiteboardsList()
  }

  if (error) {
    return (
      <div className={`whiteboard-container ${className}`}>
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h3 className="font-bold">Canvas Error:</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`whiteboard-container ${className}`}>
      {/* Drawing mode indicator */}
      {isDrawingMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-blue-700 font-medium">Drawing Mode Active</span>
            </div>
            <div className="text-sm text-blue-600">
              Press <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">Esc</kbd> to exit
            </div>
          </div>
        </div>
      )}
      
      {/* Connector mode indicator */}
      {isConnectorMode && (
        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse"></div>
              <span className="text-teal-700 font-medium">
                Connector Mode Active - {connectorStart ? 'Click second point' : 'Click first point'}
              </span>
            </div>
            <div className="text-sm text-teal-600">
              Click anywhere to {connectorStart ? 'finish' : 'start'} connector
            </div>
          </div>
        </div>
      )}
      
      <div className="toolbar mb-4 flex gap-2 flex-wrap">
        <button 
          onClick={enableDrawing}
          disabled={!isCanvasReady}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Draw
        </button>
        <button 
          onClick={disableDrawing}
          disabled={!isCanvasReady}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Select
        </button>
        <button 
          onClick={addRectangle}
          disabled={!isCanvasReady}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Rectangle
        </button>
        <button 
          onClick={addCircle}
          disabled={!isCanvasReady}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Circle
        </button>
        <button 
          onClick={showTextInputDialog}
          disabled={!isCanvasReady}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Text
        </button>
        <button 
          onClick={addImage}
          disabled={!isCanvasReady}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Image
        </button>
        <button 
          onClick={addChart}
          disabled={!isCanvasReady}
          className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Chart
        </button>
        <button 
          onClick={toggleConnectorMode}
          disabled={!isCanvasReady}
          className={`px-4 py-2 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed ${
            isConnectorMode 
              ? 'bg-teal-700 hover:bg-teal-800 border-2 border-teal-300' 
              : 'bg-teal-500 hover:bg-teal-600'
          }`}
        >
          {isConnectorMode ? 'Exit Connector' : 'Connector'}
        </button>
        <button 
          onClick={showSaveDialog_handler}
          disabled={!isCanvasReady || isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
        <button 
          onClick={showLoadDialog_handler}
          disabled={!isCanvasReady || isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Load
        </button>
        <button 
          onClick={clearCanvas}
          disabled={!isCanvasReady}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>
        <button 
          onClick={createSampleWidgets}
          disabled={!isCanvasReady}
          className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Samples
        </button>
        <button 
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className={`px-4 py-2 text-white rounded ${
            showDebugPanel 
              ? 'bg-orange-700 hover:bg-orange-800' 
              : 'bg-orange-500 hover:bg-orange-600'
          }`}
        >
          {showDebugPanel ? 'Hide Debug' : 'Show Debug'}
        </button>
        <button 
          onClick={testFabricJsLoading}
          disabled={!isCanvasReady}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Test Fix
        </button>
      </div>
      
      {/* Hidden file input for image uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        style={{ display: 'none' }}
      />
      
      {/* Text input dialog */}
      {showTextInput && (
        <div className="mb-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text to add..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={addText}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Add
            </button>
            <button
              onClick={() => setShowTextInput(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Save dialog */}
      {showSaveDialog && (
        <div className="mb-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">Save Whiteboard</h3>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={whiteboardName}
              onChange={(e) => setWhiteboardName(e.target.value)}
              placeholder="Enter whiteboard name..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <button
              onClick={saveWhiteboard}
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setShowSaveDialog(false)}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Widget Loading Alert */}
      {showLoadingAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Loading Widgets</h3>
              <p className="text-gray-600 mb-4">
                Alerting {loadedObjects.length} widgets on the whiteboard...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(alertedObjects.size / Math.max(loadedObjects.length, 1)) * 100}%` 
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {alertedObjects.size} of {loadedObjects.length} widgets alerted
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Load dialog */}
      {showLoadDialog && (
        <div className="mb-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Load Whiteboard</h3>
            <button
              onClick={() => setShowLoadDialog(false)}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
            >
              Close
            </button>
          </div>
          
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : savedWhiteboards.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No saved whiteboards found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {savedWhiteboards.map((board) => (
                <div key={board._id} className="border border-gray-200 rounded-lg p-3 bg-white">
                  {board.thumbnail && (
                    <div className="relative w-full h-20 mb-2">
                      <Image 
                        src={board.thumbnail} 
                        alt={board.name}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  )}
                  <h4 className="font-medium text-sm mb-1 truncate">{board.name}</h4>
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(board.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => loadWhiteboard(board._id)}
                      disabled={isLoading}
                      className="flex-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteWhiteboard(board._id, board.name)}
                      disabled={isLoading}
                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="canvas-wrapper border border-gray-300 rounded-lg overflow-hidden flex-grow">
          {!isCanvasReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-600">
              Loading canvas...
            </div>
          )}
          <canvas 
            ref={canvasRef}
            width={width}
            height={height}
            className="block"
          />
        </div>

        {/* Display loaded objects panel */}
        {loadedObjects.length > 0 && (
          <div className="widget-panel p-4 border border-gray-300 rounded-lg bg-gray-50 lg:w-1/4">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>Loaded Widgets ({loadedObjects.length})</span>
              {alertedObjects.size === loadedObjects.length && alertedObjects.size > 0 && (
                <span className="text-green-600 text-sm">✅ All Alerted</span>
              )}
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {loadedObjects.map((obj, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border transition-all duration-300 ${
                    alertedObjects.has(index) 
                      ? 'bg-green-50 border-green-200 shadow-sm' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        alertedObjects.has(index) 
                          ? 'bg-green-500 animate-pulse' 
                          : 'bg-gray-300'
                      }`}></div>
                      <span className="text-sm font-medium capitalize">
                        {obj.objType || obj.type || 'Unknown'}
                      </span>
                    </div>
                    {alertedObjects.has(index) && (
                      <span className="text-xs text-green-600 font-medium">ALERTED</span>
                    )}
                  </div>
                  {obj.text && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      &quot;{obj.text}&quot;
                    </p>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    Position: ({Math.round(obj.left || 0)}, {Math.round(obj.top || 0)})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="mt-4 p-4 border border-orange-300 rounded-lg bg-orange-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-orange-800">Debug Information</h3>
            <button
              onClick={() => setShowDebugPanel(false)}
              className="px-3 py-1 bg-orange-200 text-orange-800 text-sm rounded hover:bg-orange-300"
            >
              Close
            </button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Canvas State */}
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium text-gray-800 mb-2">Canvas State</h4>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(debugData.canvasState || {}, null, 2)}
              </pre>
            </div>

            {/* Current Objects */}
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium text-gray-800 mb-2">
                Current Objects ({debugData.currentObjects?.length || 0})
              </h4>
              <div className="max-h-40 overflow-y-auto">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(debugData.currentObjects || [], null, 2)}
                </pre>
              </div>
            </div>

            {/* Parsed Data */}
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium text-gray-800 mb-2">
                Parsed Canvas Data ({(debugData.parsedData?.objects as unknown[] | undefined)?.length || 0} objects)
              </h4>
              <div className="max-h-40 overflow-y-auto">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(debugData.parsedData || {}, null, 2)}
                </pre>
              </div>
            </div>

            {/* Raw Canvas Data */}
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium text-gray-800 mb-2">Raw Canvas Data</h4>
              <div className="max-h-40 overflow-y-auto">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">
                  {debugData.rawCanvasData || 'No data'}
                </pre>
              </div>
            </div>
          </div>

          {/* Analysis */}
          {debugData.parsedData && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <h4 className="font-medium text-yellow-800 mb-2">Analysis</h4>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>• Objects in saved data: {(debugData.parsedData?.objects as unknown[] | undefined)?.length || 0}</p>
                <p>• Objects loaded to canvas: {debugData.currentObjects?.length || 0}</p>
                <p>• Canvas ready: {debugData.canvasState?.isReady ? '✅ Yes' : '❌ No'}</p>
                {(debugData.parsedData?.objects as unknown[] | undefined)?.length && (debugData.parsedData?.objects as unknown[]).length > 0 && debugData.currentObjects?.length === 0 && (
                  <p className="text-red-600 font-medium">
                    ⚠️ Data exists but no objects loaded - possible deserialization issue
                  </p>
                )}
                {(debugData.parsedData?.objects && Array.isArray(debugData.parsedData.objects) && debugData.parsedData.objects.length > 0) ? (
                  <div className="mt-2">
                    <p className="font-medium">Object types in saved data:</p>
                    <ul className="ml-4 list-disc">
                      {Array.from(new Set((debugData.parsedData.objects as CanvasObject[]).map((obj: CanvasObject) => obj.objType || obj.type || 'unknown'))).map((type: string) => (
                        <li key={type}>{type}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}