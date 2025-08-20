'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'


interface WhiteboardProps {
  width?: number
  height?: number
  className?: string
}

// Manual canvas loading function - more reliable than loadFromJSON
const loadCanvasManually = async (canvas: Record<string, unknown>, canvasData: string, canvasRef: Record<string, unknown> | null): Promise<boolean> => {
  try {
    console.log('=== Starting manual canvas loading ===')
    console.log('Canvas state at start:', {
      hasCanvas: !!canvas,
      hasCanvasRef: !!canvasRef,
      canvasType: canvas.constructor?.name || 'Unknown'
    })
    
    // Parse the canvas data
    let parsedData
    try {
      parsedData = typeof canvasData === 'string' ? JSON.parse(canvasData) : canvasData
      console.log('Successfully parsed canvas data')
    } catch (parseError) {
      console.error('Failed to parse canvas data:', parseError)
      return false
    }
    
    if (!parsedData || typeof parsedData !== 'object') {
      console.error('Invalid parsed data:', parsedData)
      return false
    }
    
    console.log('Parsed canvas data details:', {
      hasObjects: !!parsedData.objects,
      objectCount: Array.isArray(parsedData.objects) ? parsedData.objects.length : 0,
      hasBackground: !!parsedData.background,
      dataKeys: Object.keys(parsedData)
    })
    
    if (Array.isArray(parsedData.objects) && parsedData.objects.length > 0) {
      console.log('First few objects:', parsedData.objects.slice(0, 3))
    }
    
    // Set canvas background
    if (parsedData.background) {
      canvas.backgroundColor = parsedData.background
      console.log('Set canvas background:', parsedData.background)
    }
    
    // Load objects manually
    if (Array.isArray(parsedData.objects)) {
      console.log(`=== Loading ${parsedData.objects.length} objects manually ===`)
      
      let successCount = 0
      let failCount = 0
      
      for (let i = 0; i < parsedData.objects.length; i++) {
        const obj = parsedData.objects[i]
        console.log(`Loading object ${i + 1}/${parsedData.objects.length}:`, {
          type: obj.type,
          left: obj.left,
          top: obj.top,
          width: obj.width,
          height: obj.height
        })
        
        try {
          // Add object based on type
          if (obj.type === 'rect') {
            await addRectToCanvas(canvas, obj, canvasRef)
            successCount++
          } else if (obj.type === 'circle') {
            await addCircleToCanvas(canvas, obj, canvasRef)
            successCount++
          } else if (obj.type === 'text' || obj.type === 'i-text') {
            await addTextToCanvas(canvas, obj, canvasRef)
            successCount++
          } else if (obj.type === 'path') {
            // Free drawing paths - try to recreate
            await addPathToCanvas(canvas, obj, canvasRef)
            successCount++
          } else if (obj.type === 'line' || obj.type === 'connector' || obj.type === 'xconnector') {
            // Connectors and lines
            await addConnectorToCanvas(canvas, obj, canvasRef)
            successCount++
          } else {
            console.warn(`Unknown object type: ${obj.type}`)
            failCount++
          }
          
          // Force render after each object for debugging
          if (canvas.renderAll) {
            ;(canvas.renderAll as () => void)()
          }
          
          // Check current object count
          const currentCount = canvas.getObjects ? (canvas.getObjects as () => unknown[])().length : 0
          console.log(`After loading object ${i + 1}: canvas now has ${currentCount} objects`)
          
        } catch (error) {
          console.error(`Failed to load object ${i + 1}:`, error)
          failCount++
        }
      }
      
      console.log(`=== Object loading complete: ${successCount} success, ${failCount} failed ===`)
    } else {
      console.warn('No objects array found in parsed data')
    }
    
    // Force render
    setTimeout(() => {
      if (canvas.renderAll) {
        (canvas.renderAll as () => void)()
      }
      
      // Check final state
      const finalCount = canvas.getObjects ? (canvas.getObjects as () => unknown[])().length : 0
      console.log(`Manual loading complete. Final object count: ${finalCount}`)
    }, 100)
    
    return true
  } catch (error) {
    console.error('Manual loading failed:', error)
    return false
  }
}

// Helper functions for adding different object types
const addRectToCanvas = async (canvas: Record<string, unknown>, obj: Record<string, unknown>, canvasRef: Record<string, unknown> | null) => {
  try {
    console.log('Adding rectangle with props:', {
      left: obj.left,
      top: obj.top,
      width: obj.width,
      height: obj.height,
      fill: obj.fill,
      stroke: obj.stroke
    })
    
    // Get the stored Rect constructor
    const RectClass = canvasRef?.Rect as new (props: Record<string, unknown>) => unknown
    if (RectClass) {
      const rect = new RectClass({
        left: obj.left || 0,
        top: obj.top || 0,
        width: obj.width || 100,
        height: obj.height || 100,
        fill: obj.fill || 'transparent',
        stroke: obj.stroke || '#000000',
        strokeWidth: obj.strokeWidth || 1,
        selectable: obj.selectable !== false,
        visible: obj.visible !== false
      })
      
      console.log('Created rectangle object:', rect)
      
      if (canvas.add) {
        (canvas.add as (obj: unknown) => void)(rect)
        console.log('Successfully added rectangle to canvas')
      } else {
        throw new Error('Canvas add method not available')
      }
    } else {
      throw new Error('Rect constructor not available')
    }
  } catch (error) {
    console.error('Failed to add rectangle:', error)
    throw error
  }
}

const addCircleToCanvas = async (canvas: Record<string, unknown>, obj: Record<string, unknown>, canvasRef: Record<string, unknown> | null) => {
  try {
    const CircleClass = canvasRef?.Circle as new (props: Record<string, unknown>) => unknown
    if (CircleClass) {
      const circle = new CircleClass({
        left: obj.left || 0,
        top: obj.top || 0,
        radius: obj.radius || 50,
        fill: obj.fill || 'transparent',
        stroke: obj.stroke || '#000000',
        strokeWidth: obj.strokeWidth || 1
      })
      
      if (canvas.add) {
        (canvas.add as (obj: unknown) => void)(circle)
        console.log('Added circle to canvas')
      }
    }
  } catch (error) {
    console.error('Failed to add circle:', error)
  }
}

const addTextToCanvas = async (canvas: Record<string, unknown>, obj: Record<string, unknown>, canvasRef: Record<string, unknown> | null) => {
  try {
    const TextClass = canvasRef?.Text as new (text: string, props: Record<string, unknown>) => unknown
    if (TextClass) {
      const text = new TextClass((obj.text as string) || 'Text', {
        left: obj.left || 0,
        top: obj.top || 0,
        fontSize: obj.fontSize || 20,
        fill: obj.fill || '#000000',
        fontFamily: obj.fontFamily || 'Arial'
      })
      
      if (canvas.add) {
        (canvas.add as (obj: unknown) => void)(text)
        console.log('Added text to canvas')
      }
    }
  } catch (error) {
    console.error('Failed to add text:', error)
  }
}

const addPathToCanvas = async (canvas: Record<string, unknown>, obj: Record<string, unknown>, canvasRef: Record<string, unknown> | null) => {
  try {
    // For paths (free drawing), we might need to reconstruct them
    // This is more complex, so we'll skip for now but log the attempt
    console.log('Skipping path object (free drawing) - complex reconstruction needed', { 
      canvas: !!canvas, 
      canvasRef: !!canvasRef, 
      pathType: obj.type 
    })
  } catch (error) {
    console.error('Failed to add path:', error)
  }
}

const addConnectorToCanvas = async (canvas: Record<string, unknown>, obj: Record<string, unknown>, canvasRef: Record<string, unknown> | null) => {
  try {
    const ConnectorClass = canvasRef?.Connector as new (props: Record<string, unknown>) => unknown
    if (ConnectorClass) {
      const connector = new ConnectorClass({
        x1: obj.x1 || 0,
        y1: obj.y1 || 0,
        x2: obj.x2 || 100,
        y2: obj.y2 || 100,
        stroke: obj.stroke || '#000000',
        strokeWidth: obj.strokeWidth || 2,
        fill: obj.fill || '',
        selectable: obj.selectable !== false
      })
      
      if (canvas.add) {
        (canvas.add as (obj: unknown) => void)(connector)
        console.log('Added connector to canvas')
      }
    } else {
      // Fallback: try Line class
      const LineClass = canvasRef?.Line as new (points: number[], props: Record<string, unknown>) => unknown
      if (LineClass) {
        const line = new LineClass([
          (obj.x1 as number) || 0, 
          (obj.y1 as number) || 0, 
          (obj.x2 as number) || 100, 
          (obj.y2 as number) || 100
        ], {
          stroke: obj.stroke || '#000000',
          strokeWidth: obj.strokeWidth || 2,
          selectable: obj.selectable !== false
        })
        
        if (canvas.add) {
          (canvas.add as (obj: unknown) => void)(line)
          console.log('Added line as connector fallback')
        }
      } else {
        console.warn('No Connector or Line class available for connector object')
      }
    }
  } catch (error) {
    console.error('Failed to add connector:', error)
  }
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
  const [isConnectorMode, setIsConnectorMode] = useState(false)
  const [connectorStart, setConnectorStart] = useState<{x: number, y: number, object?: unknown} | null>(null)
  const [whiteboardName, setWhiteboardName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [savedWhiteboards, setSavedWhiteboards] = useState<Array<{_id: string, name: string, createdAt: string, updatedAt: string, thumbnail?: string}>>([])
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Create connector between two points
  const createConnectorBetweenPoints = useCallback((start: {x: number, y: number, object?: unknown}, end: {x: number, y: number, object?: unknown}) => {
    if (!canvasXRef.current || !start || !end) {
      console.error('Invalid parameters for createConnectorBetweenPoints:', { start, end, canvasXRef: !!canvasXRef.current })
      return
    }
    
    // Validate that start and end have valid coordinates
    if (typeof start.x !== 'number' || typeof start.y !== 'number' || 
        typeof end.x !== 'number' || typeof end.y !== 'number') {
      console.error('Invalid coordinates for connector:', { start, end })
      return
    }
    
    const canvas = canvasXRef.current as Record<string, unknown>
    
    try {
      // Try to use Line class (most compatible)
      const LineConstructor = (canvasXRef.current as Record<string, unknown>).Line as new (points: number[], props: Record<string, unknown>) => unknown
      if (LineConstructor) {
        const line = new LineConstructor([start.x, start.y, end.x, end.y], {
          stroke: '#000000',
          strokeWidth: 2,
          selectable: true,
          strokeDashArray: null,
          fill: ''
        })
        ;(canvas.add as (obj: unknown) => void)(line)
        
        if (canvas.renderAll) {
          ;(canvas.renderAll as () => void)()
        }
        
        console.log('Created connector from', start, 'to', end)
      } else {
        // Fallback: create a rectangle line
        const RectConstructor = (canvasXRef.current as Record<string, unknown>).Rect as new (props: Record<string, unknown>) => unknown
        if (RectConstructor) {
          const length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
          const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI
          
          const lineRect = new RectConstructor({
            left: start.x,
            top: start.y - 1,
            width: length,
            height: 2,
            fill: '#000000',
            stroke: '#000000',
            strokeWidth: 0,
            angle: angle,
            originX: 'left',
            originY: 'center',
            selectable: true
          })
          
          ;(canvas.add as (obj: unknown) => void)(lineRect)
          
          if (canvas.renderAll) {
            ;(canvas.renderAll as () => void)()
          }
          
          console.log('Created rectangle connector from', start, 'to', end)
        } else {
          console.error('No Line or Rect constructor available for connector creation')
        }
      }
    } catch (error) {
      console.error('Error creating connector:', error)
    }
  }, [])

  // Handle connector click interactions
  const handleConnectorClick = useCallback((e: Record<string, unknown>) => {
    try {
      const canvas = canvasXRef.current as Record<string, unknown>
      
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
        const clickedObject = e.target
        setConnectorStart({
          x: pointer.x,
          y: pointer.y,
          object: clickedObject !== canvas ? clickedObject : undefined
        })
        console.log('Connector start set at:', pointer.x, pointer.y)
      } else {
        // Second click - complete connector
        const clickedObject = e.target
        const endPoint = {
          x: pointer.x,
          y: pointer.y,
          object: clickedObject !== canvas ? clickedObject : undefined
        }
        
        createConnectorBetweenPoints(connectorStart, endPoint)
        setConnectorStart(null)
        setIsConnectorMode(false) // Exit connector mode after creating one
      }
    } catch (error) {
      console.error('Error handling connector click:', error)
    }
  }, [connectorStart, createConnectorBetweenPoints])

  // Set up canvas event handlers for interactive features
  const setupCanvasEventHandlers = useCallback((canvas: Record<string, unknown>) => {
    try {
      // Mouse down event for connector creation
      if (canvas.on) {
        (canvas.on as (event: string, handler: (e: Record<string, unknown>) => void) => void)('mouse:down', (e: Record<string, unknown>) => {
          if (isConnectorMode) {
            handleConnectorClick(e)
          }
        })
        
        console.log('Canvas event handlers set up successfully')
      }
    } catch (error) {
      console.error('Failed to set up canvas event handlers:', error)
    }
  }, [isConnectorMode, handleConnectorClick])

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
          canvasXRef.current.Connector = (canvasModule as Record<string, unknown>).XConnector || (canvasModule as Record<string, unknown>).Connector || (canvasModule as Record<string, unknown>).Line
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
            canvasType: canvas.constructor.name || 'Unknown',
            hasConnector: !!(canvasXRef.current as Record<string, unknown>).Connector,
            hasLine: !!(canvasXRef.current as Record<string, unknown>).Line
          })
          
          setIsCanvasReady(true)
          // Set up canvas event handlers for interactive features
          setupCanvasEventHandlers(canvas)
          
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
  }, [width, height, setupCanvasEventHandlers])

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
        const img = new window.Image()
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


  // Enable connector mode
  const enableConnectorMode = () => {
    setIsConnectorMode(true)
    setIsDrawingMode(false)
    setConnectorStart(null)
    console.log('Connector mode enabled - click two points to create a connector')
  }

  // Toggle connector mode function
  const addConnector = () => {
    if (isConnectorMode) {
      // Exit connector mode
      setIsConnectorMode(false)
      setConnectorStart(null)
      console.log('Connector mode disabled')
    } else {
      // Enter connector mode
      enableConnectorMode()
    }
  }

  const saveWhiteboard = async () => {
    if (!canvasXRef.current || !whiteboardName.trim()) {
      alert('Please enter a name for the whiteboard')
      return
    }

    setIsLoading(true)
    console.log('Starting save operation for:', whiteboardName)
    
    try {
      const canvas = canvasXRef.current as Record<string, unknown>
      
      // Check canvas state before saving
      console.log('Canvas state before save:', {
        hasToJSON: !!canvas.toJSON,
        hasToDataURL: !!canvas.toDataURL,
        objectCount: canvas.getObjects ? (canvas.getObjects as () => unknown[])().length : 'unknown'
      })
      
      // Get canvas data as JSON string
      let canvasData = '{}'
      let canvasObject: object = {}
      
      if (canvas.toJSON) {
        try {
          canvasObject = (canvas.toJSON as () => object)()
          canvasData = JSON.stringify(canvasObject)
          console.log('Canvas data serialized successfully:', {
            length: canvasData.length,
            hasObjects: canvasData.includes('"objects"'),
            preview: canvasData.substring(0, 200) + '...'
          })
        } catch (serializeError) {
          console.error('Canvas serialization failed:', serializeError)
          throw new Error(`Failed to serialize canvas: ${serializeError instanceof Error ? serializeError.message : 'Unknown error'}`)
        }
      } else {
        console.warn('Canvas toJSON method not available')
        throw new Error('Canvas does not support serialization')
      }
      
      // Generate thumbnail
      let thumbnail = ''
      if (canvas.toDataURL) {
        try {
          thumbnail = (canvas.toDataURL as (format: string) => string)('image/png')
          console.log('Thumbnail generated, size:', thumbnail.length)
        } catch (thumbnailError) {
          console.warn('Failed to generate thumbnail:', thumbnailError)
          // Continue without thumbnail
        }
      } else {
        console.warn('Canvas toDataURL method not available')
      }

      console.log('Preparing to send request with:', {
        name: whiteboardName,
        canvasDataLength: canvasData.length,
        thumbnailLength: thumbnail.length
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

      console.log('API response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Save successful:', result)
        alert('Whiteboard saved successfully!')
        setWhiteboardName('')
        setShowSaveDialog(false)
        // Refresh the list if load dialog is open
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
      console.error('Save error (full details):', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to save whiteboard: ${errorMessage}`)
    } finally {
      setIsLoading(false)
      console.log('Save operation completed')
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
        if (data.whiteboard.canvasData) {
          console.log('Starting load process for whiteboard:', data.whiteboard.name)
          console.log('Canvas data details:', {
            type: typeof data.whiteboard.canvasData,
            length: data.whiteboard.canvasData.length,
            preview: data.whiteboard.canvasData.substring(0, 200) + '...'
          })
          
          // Clear canvas completely before loading
          console.log('Clearing canvas before load...')
          if (canvas.clear) {
            ;(canvas.clear as () => void)()
          }
          if (canvas.renderAll) {
            ;(canvas.renderAll as () => void)()
          }
          
          // Check canvas state after clearing
          console.log('Canvas state after clearing:', {
            objectCount: canvas.getObjects ? (canvas.getObjects as () => unknown[])().length : 'unknown',
            canvasReady: !!canvas,
            hasLoadFromJSON: !!canvas.loadFromJSON
          })
          
          // First, try manual recreation (most reliable method)
          console.log('Attempting manual loading...')
          const success = await loadCanvasManually(canvas, data.whiteboard.canvasData, canvasXRef.current)
          
          if (success) {
            console.log('Manual loading completed successfully')
            // Force multiple renders to ensure visibility
            setTimeout(() => {
              if (canvas.renderAll) {
                ;(canvas.renderAll as () => void)()
                console.log('Final render called after manual load')
              }
              // Check final object count
              const finalCount = canvas.getObjects ? (canvas.getObjects as () => unknown[])().length : 0
              console.log(`Final object count after manual load: ${finalCount}`)
            }, 200)
            
            setShowLoadDialog(false)
            alert(`Loaded: ${data.whiteboard.name}`)
            return
          } else {
            console.warn('Manual loading failed, trying fallback methods...')
          }
          
          // Fallback to loadFromJSON methods if manual loading fails
          if (canvas.loadFromJSON) {
            try {
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
          console.warn('Canvas loadFromJSON not available but data exists')
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
          onClick={addConnector}
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