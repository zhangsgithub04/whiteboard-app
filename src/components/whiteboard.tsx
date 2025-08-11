'use client'

import { useEffect, useRef, useState } from 'react'


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
  const canvasXRef = useRef<Record<string, unknown> | null>(null)
  const [isCanvasReady, setIsCanvasReady] = useState(false)
  const [error, setError] = useState<string>('')
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [whiteboardName, setWhiteboardName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [savedWhiteboards, setSavedWhiteboards] = useState<Array<{_id: string, name: string, createdAt: string, updatedAt: string, thumbnail?: string}>>([])
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const initCanvas = async () => {
      if (canvasRef.current && !canvasXRef.current) {
        try {
          // Dynamic import to avoid SSR issues
          const canvasModule = await import('@boardxus/canvasx')
          console.log('CanvasX module loaded:', Object.keys(canvasModule))
          
          // Try different canvas constructors
          const CanvasConstructor = canvasModule.Canvas || canvasModule.XCanvas || canvasModule.StaticCanvas
          
          if (!CanvasConstructor) {
            throw new Error('No Canvas constructor found in @boardxus/canvasx')
          }

          // Initialize Canvas
          canvasXRef.current = new CanvasConstructor(canvasRef.current, {
            width,
            height,
            backgroundColor: '#ffffff'
          }) as unknown as Record<string, unknown>

          // Store classes for later use
          canvasXRef.current.Rect = canvasModule.Rect
          canvasXRef.current.Circle = canvasModule.Circle
          canvasXRef.current.Text = (canvasModule as Record<string, unknown>).Text || (canvasModule as Record<string, unknown>).XText
          canvasXRef.current.Image = (canvasModule as Record<string, unknown>).Image || (canvasModule as Record<string, unknown>).XImage
          canvasXRef.current.Chart = (canvasModule as Record<string, unknown>).Chart || (canvasModule as Record<string, unknown>).XChart
          canvasXRef.current.PencilBrush = (canvasModule as Record<string, unknown>).PencilBrush

          // Add some default tools/functionality
          const canvas = canvasXRef.current as Record<string, unknown>

          // Enable selection and free drawing
          canvas.isDrawingMode = false
          canvas.selection = true
          
          // Initialize free drawing brush
          if (!canvas.freeDrawingBrush) {
            if (canvasXRef.current.PencilBrush) {
              const PencilBrush = canvasXRef.current.PencilBrush as new (canvas: unknown) => unknown
              canvas.freeDrawingBrush = new PencilBrush(canvas)
            } else {
              // Try to enable drawing mode directly if no specific brush class
              console.log('No PencilBrush found, will try direct drawing mode')
            }
          }
          
          if (canvas.freeDrawingBrush) {
            const brush = canvas.freeDrawingBrush as Record<string, unknown>
            brush.width = 2
            brush.color = '#000000'
          }
          
          console.log('Canvas initialized with drawing capabilities:', {
            freeDrawingBrush: !!canvas.freeDrawingBrush,
            isDrawingMode: canvas.isDrawingMode,
            hasToJSON: !!canvas.toJSON,
            hasLoadFromJSON: !!canvas.loadFromJSON,
            hasToDataURL: !!canvas.toDataURL,
            loadFromJSONType: typeof canvas.loadFromJSON,
            canvasType: canvas.constructor.name || 'Unknown'
          })
          
          setIsCanvasReady(true)
          console.log('Canvas initialized successfully')
        } catch (error) {
          console.error('Failed to initialize canvas:', error)
          setError(`Failed to initialize canvas: ${error}`)
        }
      }
    }

    initCanvas()

    return () => {
      if (canvasXRef.current && (canvasXRef.current as Record<string, unknown>).dispose) {
        ((canvasXRef.current as Record<string, unknown>).dispose as () => void)()
        canvasXRef.current = null
      }
    }
  }, [width, height])

  // Handle escape key to exit drawing mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDrawingMode) {
        disableDrawing()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDrawingMode])

  const enableDrawing = () => {
    if (canvasXRef.current) {
      const canvas = canvasXRef.current as Record<string, unknown>
      
      // Initialize brush if not present
      if (!canvas.freeDrawingBrush) {
        if (canvasXRef.current.PencilBrush) {
          const PencilBrush = canvasXRef.current.PencilBrush as new (canvas: unknown) => unknown
          canvas.freeDrawingBrush = new PencilBrush(canvas)
        } else {
          console.log('Warning: No PencilBrush available, drawing may not work properly')
        }
      }
      
      canvas.isDrawingMode = true
      canvas.selection = false
      setIsDrawingMode(true)
      
      // Configure brush properties
      if (canvas.freeDrawingBrush) {
        const brush = canvas.freeDrawingBrush as Record<string, unknown>
        brush.width = 2
        brush.color = '#000000'
      }
      
      // Force canvas to render the changes
      if (canvas.renderAll) {
        ;(canvas.renderAll as () => void)()
      }
      
      console.log('Drawing mode enabled, brush:', canvas.freeDrawingBrush)
    }
  }

  const disableDrawing = () => {
    if (canvasXRef.current) {
      const canvas = canvasXRef.current as Record<string, unknown>
      canvas.isDrawingMode = false
      canvas.selection = true
      setIsDrawingMode(false)
      
      // Force canvas to render the changes
      if (canvas.renderAll) {
        ;(canvas.renderAll as () => void)()
      }
    }
  }

  const clearCanvas = () => {
    if (canvasXRef.current) {
      const canvas = canvasXRef.current as Record<string, unknown>
      ;(canvas.clear as () => void)()
      canvas.backgroundColor = '#ffffff'
      ;(canvas.renderAll as () => void)()
    }
  }

  const addRectangle = () => {
    if (canvasXRef.current) {
      const canvas = canvasXRef.current as Record<string, unknown>
      const RectConstructor = canvas.Rect as new (props: Record<string, unknown>) => unknown
      if (RectConstructor) {
        const rect = new RectConstructor({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2
        })
        ;(canvas.add as (obj: unknown) => void)(rect)
      }
    }
  }

  const addCircle = () => {
    if (canvasXRef.current) {
      const canvas = canvasXRef.current as Record<string, unknown>
      const CircleConstructor = canvas.Circle as new (props: Record<string, unknown>) => unknown
      if (CircleConstructor) {
        const circle = new CircleConstructor({
          left: 200,
          top: 200,
          radius: 50,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2
        })
        ;(canvas.add as (obj: unknown) => void)(circle)
      }
    }
  }

  const showTextInputDialog = () => {
    setShowTextInput(true)
  }

  const addText = () => {
    if (canvasXRef.current && textInput.trim()) {
      const canvas = canvasXRef.current as Record<string, unknown>
      const TextConstructor = canvas.Text as new (text: string, props: Record<string, unknown>) => unknown
      if (TextConstructor) {
        const text = new TextConstructor(textInput, {
          left: 100,
          top: 100,
          fontSize: 20,
          fill: '#000000',
          fontFamily: 'Arial'
        })
        ;(canvas.add as (obj: unknown) => void)(text)
        setTextInput('')
        setShowTextInput(false)
      }
    }
  }

  const addImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && canvasXRef.current) {
      const canvas = canvasXRef.current as Record<string, unknown>
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        
        // Create a native Image element first
        const img = new Image()
        img.onload = () => {
          try {
            // Try fabric.Image.fromURL first
            const ImageConstructor = canvas.Image as {
              fromURL?: (url: string, callback: (fabricImg: unknown) => void, options?: Record<string, unknown>) => void
            }
            
            if (ImageConstructor?.fromURL) {
              ImageConstructor.fromURL(imageUrl, (fabricImg: unknown) => {
                if (fabricImg) {
                  const imageObj = fabricImg as Record<string, unknown>
                  imageObj.left = 50
                  imageObj.top = 50
                  imageObj.scaleX = 0.5
                  imageObj.scaleY = 0.5
                  ;(canvas.add as (obj: unknown) => void)(fabricImg)
                  ;(canvas.renderAll as () => void)()
                  console.log('Image added via fromURL method')
                }
              })
            } else {
              // Fallback: try creating Image directly
              const ImageClass = canvas.Image as new (element: HTMLImageElement, options?: Record<string, unknown>) => unknown
              if (ImageClass) {
                const fabricImg = new ImageClass(img, {
                  left: 50,
                  top: 50,
                  scaleX: 0.5,
                  scaleY: 0.5
                })
                ;(canvas.add as (obj: unknown) => void)(fabricImg)
                ;(canvas.renderAll as () => void)()
                console.log('Image added via direct Image constructor')
              } else {
                console.error('No Image constructor available')
              }
            }
          } catch (error) {
            console.error('Failed to add image to canvas:', error)
          }
        }
        
        img.onerror = () => {
          console.error('Failed to load image')
        }
        
        img.src = imageUrl
      }
      
      reader.onerror = () => {
        console.error('Failed to read file')
      }
      
      reader.readAsDataURL(file)
    }
    
    // Reset file input so same file can be selected again
    if (event.target) {
      event.target.value = ''
    }
  }

  const addChart = () => {
    if (canvasXRef.current) {
      const canvas = canvasXRef.current as Record<string, unknown>
      const ChartConstructor = canvas.Chart as new (props: Record<string, unknown>) => unknown
      
      if (ChartConstructor) {
        // Create a simple bar chart
        const chart = new ChartConstructor({
          left: 100,
          top: 100,
          width: 200,
          height: 150,
          data: [
            { label: 'A', value: 30 },
            { label: 'B', value: 80 },
            { label: 'C', value: 45 },
            { label: 'D', value: 60 }
          ],
          type: 'bar',
          fill: '#4299e1',
          stroke: '#2b6cb0'
        })
        ;(canvas.add as (obj: unknown) => void)(chart)
      } else {
        // Fallback: create a simple rectangle representing a chart
        const RectConstructor = canvas.Rect as new (props: Record<string, unknown>) => unknown
        if (RectConstructor) {
          const chartRect = new RectConstructor({
            left: 100,
            top: 100,
            width: 200,
            height: 150,
            fill: '#e2e8f0',
            stroke: '#4a5568',
            strokeWidth: 2
          })
          ;(canvas.add as (obj: unknown) => void)(chartRect)
          
          // Add chart title
          const TextConstructor = canvas.Text as new (text: string, props: Record<string, unknown>) => unknown
          if (TextConstructor) {
            const title = new TextConstructor('Sample Chart', {
              left: 150,
              top: 120,
              fontSize: 16,
              fill: '#2d3748',
              fontFamily: 'Arial',
              textAlign: 'center'
            })
            ;(canvas.add as (obj: unknown) => void)(title)
          }
        }
      }
    }
  }

  const saveWhiteboard = async () => {
    if (!canvasXRef.current || !whiteboardName.trim()) {
      alert('Please enter a name for the whiteboard')
      return
    }

    setIsLoading(true)
    try {
      const canvas = canvasXRef.current as Record<string, unknown>
      
      // Get canvas data as JSON string
      let canvasData = '{}'
      if (canvas.toJSON) {
        const canvasObject = (canvas.toJSON as () => object)()
        canvasData = JSON.stringify(canvasObject)
        console.log('Canvas data serialized, length:', canvasData.length)
      } else {
        console.warn('Canvas toJSON method not available')
      }
      
      // Generate thumbnail
      const thumbnail = canvas.toDataURL ? (canvas.toDataURL as (format: string) => string)('image/png') : ''

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
        await response.json()
        alert('Whiteboard saved successfully!')
        setWhiteboardName('')
        setShowSaveDialog(false)
        // Refresh the list if load dialog is open
        if (showLoadDialog) {
          loadWhiteboardsList()
        }
      } else {
        const error = await response.json()
        alert(`Failed to save: ${error.error}`)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save whiteboard')
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

  const loadWhiteboard = async (id: string) => {
    if (!canvasXRef.current) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/whiteboards/${id}`)
      if (response.ok) {
        const data = await response.json()
        const canvas = canvasXRef.current as Record<string, unknown>
        
        // Clear current canvas and log state before loading
        if (canvas.clear) {
          ;(canvas.clear as () => void)()
        }
        
        console.log('Canvas state before loading:', {
          objectCount: canvas.getObjects ? (canvas.getObjects as () => unknown[])().length : 'unknown',
          width: canvas.width,
          height: canvas.height,
          backgroundColor: canvas.backgroundColor
        })

        // Load canvas data
        if (canvas.loadFromJSON && data.whiteboard.canvasData) {
          try {
            console.log('Loading canvas data:', {
              type: typeof data.whiteboard.canvasData,
              length: data.whiteboard.canvasData.length,
              preview: data.whiteboard.canvasData.substring(0, 100) + '...'
            })
            
            // Parse the JSON string back to object if needed
            let canvasDataToLoad
            if (typeof data.whiteboard.canvasData === 'string') {
              canvasDataToLoad = JSON.parse(data.whiteboard.canvasData)
            } else {
              canvasDataToLoad = data.whiteboard.canvasData
            }
            
            console.log('Parsed canvas data:', canvasDataToLoad)
            
            // Try different loadFromJSON approaches
            let loaded = false
            let lastError: Error | null = null
            
            // Approach 1: Try with callback
            if (!loaded) {
              try {
                console.log('Trying loadFromJSON with callback (parsed object)')
                const loadFromJSON = canvas.loadFromJSON as (data: unknown, callback?: () => void) => void
                
                await new Promise<void>((resolve, reject) => {
                  const timeoutId = setTimeout(() => {
                    reject(new Error('Loading timeout after 5 seconds'))
                  }, 5000)
                  
                  try {
                    loadFromJSON(canvasDataToLoad, () => {
                      clearTimeout(timeoutId)
                      console.log('Canvas loaded successfully with callback')
                      
                      // Force multiple render attempts
                      setTimeout(() => {
                        if (canvas.renderAll) {
                          ;(canvas.renderAll as () => void)()
                          console.log('Canvas renderAll called')
                        }
                        if (canvas.requestRenderAll) {
                          ;(canvas.requestRenderAll as () => void)()
                          console.log('Canvas requestRenderAll called')
                        }
                        
                        // Log what was loaded
                        console.log('Canvas objects after load:', {
                          objectCount: canvas.getObjects ? (canvas.getObjects as () => unknown[])().length : 'unknown',
                          canvasSize: { width: canvas.width, height: canvas.height }
                        })
                      }, 100)
                      
                      loaded = true
                      resolve()
                    })
                  } catch (error) {
                    clearTimeout(timeoutId)
                    reject(error as Error)
                  }
                })
              } catch (error) {
                lastError = error as Error
                console.warn('Callback approach failed:', error)
              }
            }
            
            // Approach 2: Try synchronous loading (no callback)
            if (!loaded) {
              try {
                console.log('Trying synchronous loadFromJSON')
                const loadFromJSON = canvas.loadFromJSON as (data: unknown) => void
                loadFromJSON(canvasDataToLoad)
                
                // Give the canvas time to process the data
                setTimeout(() => {
                  if (canvas.renderAll) {
                    ;(canvas.renderAll as () => void)()
                    console.log('Canvas renderAll called (sync)')
                  }
                  if (canvas.requestRenderAll) {
                    ;(canvas.requestRenderAll as () => void)()
                    console.log('Canvas requestRenderAll called (sync)')
                  }
                  
                  // Log loaded objects
                  console.log('Canvas objects after sync load:', {
                    objectCount: canvas.getObjects ? (canvas.getObjects as () => unknown[])().length : 'unknown'
                  })
                }, 100)
                
                loaded = true
                console.log('Canvas loaded successfully (synchronous)')
              } catch (error) {
                lastError = error as Error
                console.warn('Synchronous approach failed:', error)
              }
            }
            
            // Approach 3: Try with JSON string
            if (!loaded && typeof data.whiteboard.canvasData === 'string') {
              try {
                console.log('Trying loadFromJSON with original string data')
                const loadFromJSON = canvas.loadFromJSON as (data: unknown) => void
                loadFromJSON(data.whiteboard.canvasData)
                
                if (canvas.renderAll) {
                  ;(canvas.renderAll as () => void)()
                }
                loaded = true
                console.log('Canvas loaded successfully (string data)')
              } catch (error) {
                lastError = error as Error
                console.warn('String data approach failed:', error)
              }
            }
            
            // Approach 4: Try manual object recreation (fallback)
            if (!loaded && canvasDataToLoad && canvasDataToLoad.objects) {
              try {
                console.log('Trying manual object recreation fallback')
                const objects = (canvasDataToLoad as Record<string, unknown>).objects
                
                // Clear canvas first
                if (canvas.clear) {
                  ;(canvas.clear as () => void)()
                }
                
                // Set background if available
                if ((canvasDataToLoad as Record<string, unknown>).background) {
                  canvas.backgroundColor = (canvasDataToLoad as Record<string, unknown>).background
                }
                
                // Try to add each object manually
                if (Array.isArray(objects)) {
                  for (const obj of objects) {
                    const canvasObj = obj as Record<string, unknown>
                    if (canvasObj.type === 'rect' && canvasXRef.current?.Rect) {
                      const RectClass = canvasXRef.current.Rect as new (props: unknown) => unknown
                      const rect = new RectClass(obj)
                      ;(canvas.add as (obj: unknown) => void)(rect)
                    } else if (canvasObj.type === 'circle' && canvasXRef.current?.Circle) {
                      const CircleClass = canvasXRef.current.Circle as new (props: unknown) => unknown
                      const circle = new CircleClass(obj)
                      ;(canvas.add as (obj: unknown) => void)(circle)
                    } else if (canvasObj.type === 'text' || canvasObj.type === 'i-text') {
                      // Try to recreate text objects
                      if (canvasXRef.current?.Text) {
                        const TextClass = canvasXRef.current.Text as new (text: string, props: unknown) => unknown
                        const text = new TextClass(canvasObj.text as string || '', obj)
                        ;(canvas.add as (obj: unknown) => void)(text)
                      }
                    }
                    // Add more object types as needed
                  }
                }
                
                if (canvas.renderAll) {
                  ;(canvas.renderAll as () => void)()
                }
                loaded = true
                console.log('Canvas loaded successfully (manual recreation)')
              } catch (error) {
                lastError = error as Error
                console.warn('Manual recreation failed:', error)
              }
            }
            
            if (!loaded) {
              throw new Error(`All loading attempts failed. Last error: ${lastError?.message || 'Unknown error'}`)
            }
            
            // Force final render after successful load
            setTimeout(() => {
              console.log('Final render attempt after successful load')
              if (canvas.renderAll) {
                ;(canvas.renderAll as () => void)()
              }
              if (canvas.requestRenderAll) {
                ;(canvas.requestRenderAll as () => void)()
              }
              
              // Also try to refresh the canvas display
              if (canvas.calcOffset) {
                ;(canvas.calcOffset as () => void)()
              }
              
              // Set canvas dimensions if they're different
              if (canvas.setDimensions) {
                (canvas.setDimensions as (dims: {width: number, height: number}) => void)({
                  width: width,
                  height: height
                })
                console.log('Canvas dimensions reset to:', width, 'x', height)
              }
              
              // Check final object count and object positions
              if (canvas.getObjects) {
                const objects = (canvas.getObjects as () => unknown[])()
                console.log(`Final canvas state: ${objects.length} objects loaded`)
                
                if (objects.length === 0) {
                  console.warn('Warning: No objects found on canvas after loading')
                } else {
                  // Log object positions to check if they're visible
                  objects.forEach((obj, index) => {
                    const canvasObj = obj as Record<string, unknown>
                    console.log(`Object ${index}:`, {
                      type: canvasObj.type,
                      left: canvasObj.left,
                      top: canvasObj.top,
                      width: canvasObj.width,
                      height: canvasObj.height,
                      visible: canvasObj.visible !== false
                    })
                  })
                  
                  // If objects seem to be outside visible area, try to center them
                  const firstObj = objects[0] as Record<string, unknown>
                  if (firstObj && (typeof firstObj.left === 'number' && (firstObj.left < 0 || firstObj.left > width))) {
                    console.log('Objects may be outside visible area, attempting to fix positioning')
                    if (canvas.renderAll) {
                      ;(canvas.renderAll as () => void)()
                    }
                  }
                }
              }
            }, 200)
            
            // Only show success message if actually loaded
            setShowLoadDialog(false)
            alert(`Loaded: ${data.whiteboard.name}`)
            
          } catch (parseError) {
            console.error('Error parsing canvas data:', parseError)
            console.error('Raw canvas data:', data.whiteboard.canvasData)
            alert(`Error loading whiteboard: ${parseError instanceof Error ? parseError.message : 'Invalid data format'}`)
            return // Don't show success message on error
          }
        } else {
          console.warn('Canvas loadFromJSON not available or no canvas data')
          if (!canvas.loadFromJSON) {
            console.warn('loadFromJSON method not found on canvas')
            alert('Error: Canvas does not support loading data')
          } else if (!data.whiteboard.canvasData) {
            console.warn('No canvas data in whiteboard')
            alert('Error: No canvas data found in whiteboard')
          }
          return // Don't show success message
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
        loadWhiteboardsList() // Refresh the list
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
                    <img 
                      src={board.thumbnail} 
                      alt={board.name}
                      className="w-full h-20 object-cover rounded mb-2"
                    />
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
      
      <div className="canvas-wrapper border border-gray-300 rounded-lg overflow-hidden">
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
    </div>
  )
}