export interface CanvasObject {
  objType?: string // XPath, XText, XShape, etc.
  type?: string // Fabric.js types: Rect, Circle, Text, etc.
  left?: number
  top?: number
  width?: number
  height?: number
  radius?: number
  text?: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  [key: string]: unknown
}

interface WhiteboardData {
  objects?: CanvasObject[]
  background?: string
  [key: string]: unknown
}

export class WhiteboardManager {
  private canvas: Record<string, unknown> | null = null
  private canvasModule: Record<string, unknown> | null = null
  private isReady = false
  
  // Event listeners
  private onReadyCallbacks: (() => void)[] = []
  private onErrorCallbacks: ((error: string) => void)[] = []

  constructor() {
    console.log('WhiteboardManager created')
  }

  // Initialize the canvas with the HTML canvas element
  async initialize(canvasElement: HTMLCanvasElement, width: number, height: number): Promise<void> {
    try {
      console.log('Initializing WhiteboardManager...')
      
      // Dynamic import to avoid SSR issues
      this.canvasModule = await import('@boardxus/canvasx')
      console.log('CanvasX module loaded:', Object.keys(this.canvasModule))
      
      // Try different canvas constructors
      const CanvasConstructor = this.canvasModule.Canvas || this.canvasModule.XCanvas || this.canvasModule.StaticCanvas
      
      if (!CanvasConstructor) {
        throw new Error('No Canvas constructor found in @boardxus/canvasx')
      }

      // Initialize Canvas
      this.canvas = new (CanvasConstructor as new (...args: unknown[]) => Record<string, unknown>)(canvasElement, {
        width,
        height,
        backgroundColor: '#ffffff'
      })

      // Store classes for later use
      this.canvas.Rect = this.canvasModule.Rect
      this.canvas.Circle = this.canvasModule.Circle
      this.canvas.Text = this.canvasModule.Text || this.canvasModule.XText
      this.canvas.Image = this.canvasModule.Image || this.canvasModule.XImage
      this.canvas.Chart = this.canvasModule.Chart || this.canvasModule.XChart
      this.canvas.Connector = this.canvasModule.XConnector || this.canvasModule.Connector || this.canvasModule.Line
      this.canvas.Line = this.canvasModule.Line
      this.canvas.PencilBrush = this.canvasModule.PencilBrush

      // Configure canvas
      this.canvas.isDrawingMode = false
      this.canvas.selection = true
      
      // Initialize free drawing brush
      if (this.canvas.PencilBrush) {
        const PencilBrush = this.canvas.PencilBrush as new (canvas: unknown) => Record<string, unknown>
        this.canvas.freeDrawingBrush = new PencilBrush(this.canvas)
        
        const brush = this.canvas.freeDrawingBrush as Record<string, unknown>
        brush.width = 2
        brush.color = '#000000'
      }

      this.isReady = true
      console.log('WhiteboardManager initialized successfully')
      
      // Notify ready callbacks
      this.onReadyCallbacks.forEach(callback => callback())
      
    } catch (error) {
      const errorMessage = `Failed to initialize WhiteboardManager: ${error}`
      console.error(errorMessage)
      this.onErrorCallbacks.forEach(callback => callback(errorMessage))
      throw error
    }
  }

  // Event listeners
  onReady(callback: () => void): void {
    if (this.isReady) {
      callback()
    } else {
      this.onReadyCallbacks.push(callback)
    }
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallbacks.push(callback)
  }

  // Canvas state methods
  getIsReady(): boolean {
    return this.isReady && !!this.canvas
  }

  // Drawing mode methods
  enableDrawingMode(): void {
    if (!this.canvas) return
    
    // Initialize brush if not present
    if (!this.canvas.freeDrawingBrush && this.canvas.PencilBrush) {
      const PencilBrush = this.canvas.PencilBrush as new (canvas: unknown) => Record<string, unknown>
      this.canvas.freeDrawingBrush = new PencilBrush(this.canvas)
    }
    
    this.canvas.isDrawingMode = true
    this.canvas.selection = false
    
    // Configure brush properties
    if (this.canvas.freeDrawingBrush) {
      const brush = this.canvas.freeDrawingBrush as Record<string, unknown>
      brush.width = 2
      brush.color = '#000000'
    }
    
    this.render()
    console.log('Drawing mode enabled')
  }

  disableDrawingMode(): void {
    if (!this.canvas) return
    
    this.canvas.isDrawingMode = false
    this.canvas.selection = true
    this.render()
    console.log('Drawing mode disabled')
  }

  // Shape creation methods
  addRectangle(options?: Partial<CanvasObject>): void {
    if (!this.canvas || !this.canvas.Rect) return
    
    const RectConstructor = this.canvas.Rect as new (props: Record<string, unknown>) => unknown
    const rect = new RectConstructor({
      left: options?.left || 100,
      top: options?.top || 100,
      width: options?.width || 100,
      height: options?.height || 100,
      fill: options?.fill || 'transparent',
      stroke: options?.stroke || '#000000',
      strokeWidth: options?.strokeWidth || 2
    })
    
    this.addToCanvas(rect)
  }

  addCircle(options?: Partial<CanvasObject>): void {
    if (!this.canvas || !this.canvas.Circle) return
    
    const CircleConstructor = this.canvas.Circle as new (props: Record<string, unknown>) => unknown
    const circle = new CircleConstructor({
      left: options?.left || 200,
      top: options?.top || 200,
      radius: options?.radius || 50,
      fill: options?.fill || 'transparent',
      stroke: options?.stroke || '#000000',
      strokeWidth: options?.strokeWidth || 2
    })
    
    this.addToCanvas(circle)
  }

  addText(text: string, options?: Partial<CanvasObject>): void {
    if (!this.canvas || !this.canvas.Text || !text.trim()) return
    
    const TextConstructor = this.canvas.Text as new (text: string, props: Record<string, unknown>) => unknown
    const textObj = new TextConstructor(text, {
      left: options?.left || 100,
      top: options?.top || 100,
      fontSize: 20,
      fill: options?.fill || '#000000',
      fontFamily: 'Arial'
    })
    
    this.addToCanvas(textObj)
  }

  addImage(file: File, callback?: (success: boolean) => void): void {
    if (!this.canvas || !file) {
      callback?.(false)
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      
      const img = new window.Image()
      img.onload = () => {
        try {
          const ImageConstructor = this.canvas!.Image as {
            fromURL?: (url: string, callback: (fabricImg: unknown) => void, options?: Record<string, unknown>) => void
          } | (new (element: HTMLImageElement, options?: Record<string, unknown>) => unknown)

          if (typeof ImageConstructor === 'object' && ImageConstructor.fromURL) {
            ImageConstructor.fromURL(imageUrl, (fabricImg: unknown) => {
              if (fabricImg) {
                const imageObj = fabricImg as Record<string, unknown>
                imageObj.left = 50
                imageObj.top = 50
                imageObj.scaleX = 0.5
                imageObj.scaleY = 0.5
                this.addToCanvas(fabricImg)
                callback?.(true)
              } else {
                callback?.(false)
              }
            })
          } else if (typeof ImageConstructor === 'function') {
            const fabricImg = new (ImageConstructor as new (element: HTMLImageElement, options?: Record<string, unknown>) => unknown)(img, {
              left: 50,
              top: 50,
              scaleX: 0.5,
              scaleY: 0.5
            })
            this.addToCanvas(fabricImg)
            callback?.(true)
          } else {
            console.error('No Image constructor available')
            callback?.(false)
          }
        } catch (error) {
          console.error('Failed to add image to canvas:', error)
          callback?.(false)
        }
      }
      
      img.onerror = () => {
        console.error('Failed to load image')
        callback?.(false)
      }
      
      img.src = imageUrl
    }
    
    reader.onerror = () => {
      console.error('Failed to read file')
      callback?.(false)
    }
    
    reader.readAsDataURL(file)
  }

  addChart(options?: Partial<CanvasObject>): void {
    if (!this.canvas) return
    
    const ChartConstructor = this.canvas.Chart as new (props: Record<string, unknown>) => unknown | undefined
    
    if (ChartConstructor) {
      const chart = new ChartConstructor({
        left: options?.left || 100,
        top: options?.top || 100,
        width: options?.width || 200,
        height: options?.height || 150,
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
      this.addToCanvas(chart)
    } else {
      // Fallback: create a rectangle representing a chart
      this.addRectangle({
        left: options?.left || 100,
        top: options?.top || 100,
        width: options?.width || 200,
        height: options?.height || 150,
        fill: '#e2e8f0',
        stroke: '#4a5568',
        strokeWidth: 2
      })
      
      this.addText('Sample Chart', {
        left: (options?.left || 100) + 50,
        top: (options?.top || 100) + 20
      })
    }
  }

  // Connector methods
  addConnector(x1: number, y1: number, x2: number, y2: number): void {
    if (!this.canvas) return
    
    const LineConstructor = this.canvas.Line as new (points: number[], props: Record<string, unknown>) => unknown | undefined
    
    if (LineConstructor) {
      const line = new LineConstructor([x1, y1, x2, y2], {
        stroke: '#000000',
        strokeWidth: 2,
        selectable: true,
        strokeDashArray: null,
        fill: ''
      })
      this.addToCanvas(line)
    } else {
      // Fallback: create a rectangle line
      this.addRectangle({
        left: x1,
        top: y1 - 1,
        width: Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
        height: 2,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 0
      })
    }
  }

  // Canvas management methods
  clear(): void {
    if (!this.canvas) return
    
    const clearFn = this.canvas.clear as (() => void) | undefined
    if (clearFn) {
      clearFn.call(this.canvas)
    }
    
    this.canvas.backgroundColor = '#ffffff'
    this.render()
  }

  render(): void {
    if (!this.canvas) return
    
    const renderFn = this.canvas.renderAll as (() => void) | undefined
    if (renderFn) {
      renderFn.call(this.canvas)
    }
  }

  // Save/Load methods
  async serialize(): Promise<string> {
    if (!this.canvas) throw new Error('Canvas not initialized')
    
    const toJSONFn = this.canvas.toJSON as (() => object) | undefined
    if (!toJSONFn) throw new Error('Canvas serialization not supported')
    
    try {
      const canvasObject = toJSONFn.call(this.canvas)
      const serialized = JSON.stringify(canvasObject)
      console.log('Canvas serialized successfully:', {
        objectCount: this.getObjectCount(),
        dataSize: serialized.length
      })
      return serialized
    } catch (error) {
      console.error('Serialization failed:', error)
      throw new Error(`Failed to serialize canvas: ${error}`)
    }
  }

  async deserialize(data: string): Promise<boolean> {
    if (!this.canvas) {
      console.error('❌ Canvas not initialized')
      return false
    }

    try {
      console.log('🚀 === Starting whiteboard deserialization ===')
      console.log('📊 Canvas state:', {
        hasCanvas: !!this.canvas,
        canvasType: this.canvas.constructor?.name || 'Unknown',
        currentObjectCount: this.getObjectCount()
      })
      console.log('Received data for deserialization:', data.substring(0, 500) + (data.length > 500 ? '...' : '')) // Log first 500 chars
      
      // Parse the data
      let parsedData: WhiteboardData
      try {
        parsedData = typeof data === 'string' ? JSON.parse(data) : data
        console.log('✅ Data parsed successfully')
      } catch (parseError) {
        console.error('❌ Failed to parse whiteboard data:', parseError)
        return false
      }

      if (!parsedData || typeof parsedData !== 'object') {
        console.error('❌ Invalid parsed data:', parsedData)
        return false
      }

      console.log('📋 Parsed data details:', {
        hasObjects: !!parsedData.objects,
        objectCount: Array.isArray(parsedData.objects) ? parsedData.objects.length : 0,
        hasBackground: !!parsedData.background,
        dataKeys: Object.keys(parsedData),
        firstFewObjects: Array.isArray(parsedData.objects) ? parsedData.objects.slice(0, 3) : []
      })

      // Clear canvas
      console.log('🧹 Clearing canvas...')
      this.clear()
      console.log('🔍 After clear - object count:', this.getObjectCount())

      // Set background
      if (parsedData.background) {
        this.canvas.backgroundColor = parsedData.background
        console.log('🎨 Set background:', parsedData.background)
      }

      // Load objects
      if (Array.isArray(parsedData.objects) && parsedData.objects.length > 0) {
        console.log(`🔄 Loading ${parsedData.objects.length} objects...`)
        console.log('🔍 Raw objects data:', JSON.stringify(parsedData.objects, null, 2))
        
        let successCount = 0
        let failCount = 0

        for (let i = 0; i < parsedData.objects.length; i++) {
          const obj = parsedData.objects[i]
          console.log(`🔧 Loading object ${i + 1}/${parsedData.objects.length}:`, {
            objType: obj.objType,
            type: obj.type,
            left: obj.left,
            top: obj.top,
            width: obj.width,
            height: obj.height,
            hasConstructor: !!(obj.objType || obj.type) && !!this.canvas[obj.objType || obj.type || ''],
            fullObjectData: obj
          })

          await new Promise<void>(resolve => {
            setTimeout(async () => {
              try {
                const success = await this.recreateObject(obj)
                if (success) {
                  successCount++
                  console.log(`✅ Object ${i + 1} recreated successfully`)
                  // Check object count after each addition
                  const currentCount = this.getObjectCount()
                  console.log(`📊 Canvas now has ${currentCount} objects`)
                } else {
                  failCount++
                  console.log(`❌ Failed to recreate object ${i + 1}`)
                }
              } catch (error) {
                console.error(`❌ Exception recreating object ${i + 1}:`, error)
                failCount++
              }

              // Force render after each object
              this.render()
              resolve()
            }, 50) // 50ms delay for visual effect
          })
        }
        console.log(`📋 Object loading complete: ${successCount} success, ${failCount} failed`)
      } else {
        console.log('❌ No objects to load or invalid objects array')
        console.log('🔍 Parsed data structure:', {
          hasObjects: !!parsedData.objects,
          objectsType: typeof parsedData.objects,
          objectsLength: Array.isArray(parsedData.objects) ? parsedData.objects.length : 'not array',
          objectsContent: parsedData.objects
        })
      }

      // Multiple final renders to ensure visibility
      console.log('🎨 Performing final renders...')
      this.render()
      setTimeout(() => {
        this.render()
        console.log('🎨 Second render completed')
      }, 100)
      setTimeout(() => {
        this.render()
        console.log('🎨 Third render completed')
        
        // Final verification
        const finalCount = this.getObjectCount()
        console.log(`📊 Final verification - Canvas has ${finalCount} objects`)
        
        // Check if canvas has visibility methods
        if (this.canvas && this.canvas.calcOffset) {
          (this.canvas.calcOffset as () => void)()
          console.log('🔄 Canvas calcOffset called')
        }
        if (this.canvas && this.canvas.requestRenderAll) {
          (this.canvas.requestRenderAll as () => void)()
          console.log('🔄 Canvas requestRenderAll called')
        }
      }, 200)
      
      // Verify final state
      const finalCount = this.getObjectCount()
      console.log(`✅ Deserialization complete. Final object count: ${finalCount}`)
      
      return true

    } catch (error) {
      console.error('💥 Deserialization failed:', error)
      return false
    }
  }

  generateThumbnail(): string {
    if (!this.canvas) return ''
    
    const toDataURLFn = this.canvas.toDataURL as ((format: string) => string) | undefined
    if (!toDataURLFn) return ''
    
    try {
      return toDataURLFn.call(this.canvas, 'image/png')
    } catch (error) {
      console.warn('Failed to generate thumbnail:', error)
      return ''
    }
  }

  // Event handling
  addEventListener(event: string, handler: (e: Record<string, unknown>) => void): void {
    if (!this.canvas) return
    
    const onFn = this.canvas.on as ((event: string, handler: (e: Record<string, unknown>) => void) => void) | undefined
    if (onFn) {
      onFn.call(this.canvas, event, handler)
    }
  }

  // Utility methods
  getObjects(): CanvasObject[] {
    if (!this.canvas) return []
    
    const getObjectsFn = this.canvas.getObjects as (() => CanvasObject[]) | undefined
    return getObjectsFn ? getObjectsFn.call(this.canvas) : []
  }

  getObjectCount(): number {
    return this.getObjects().length
  }

  dispose(): void {
    if (this.canvas) {
      const disposeFn = this.canvas.dispose as (() => void) | undefined
      if (disposeFn) {
        disposeFn.call(this.canvas)
      }
      this.canvas = null
    }
    this.canvasModule = null
    this.isReady = false
    console.log('WhiteboardManager disposed')
  }

  // Private methods
  private addToCanvas(obj: unknown): void {
    if (!this.canvas) {
      console.error('❌ Canvas not available for addToCanvas')
      return
    }
    
    const addFn = this.canvas.add as ((obj: unknown) => void) | undefined
    if (addFn) {
      console.log('➕ Adding object to canvas...', obj)
      addFn.call(this.canvas, obj)
      this.render()
      
      // Verify the object was added
      const newCount = this.getObjectCount()
      console.log(`✅ Object added. New canvas object count: ${newCount}`)
    } else {
      console.error('❌ Canvas add method not available')
    }
  }

  private async recreateObject(obj: CanvasObject): Promise<boolean> {
    if (!this.canvas) {
      console.error('❌ Canvas not available for object recreation')
      return false
    }

    try {
      const objectType = obj.objType || obj.type || 'unknown'
      console.log(`🔧 Recreating ${objectType} object with data:`, obj)
      
      // Check object count before creation
      const beforeCount = this.getObjectCount()
      console.log(`📊 Object count before creation: ${beforeCount}`)
      
      // Handle XPath, XText, XShape, etc. patterns
      switch (objectType) {
        case 'XShape':
        case 'rect':
        case 'Rect':  // Added capital R for Fabric.js Rect objects
          console.log('📐 Creating rectangle...')
          this.addRectangle(obj)
          break
        
        case 'circle':
        case 'Circle':  // Added capital C for Fabric.js Circle objects
          console.log('⭕ Creating circle...')
          this.addCircle(obj)
          break
        
        case 'XText':
        case 'text':
        case 'Text':   // Added capital T for Fabric.js Text objects
        case 'i-text':
        case 'IText':  // Added capital I for Fabric.js IText objects
          if (obj.text) {
            console.log('📝 Creating text:', obj.text)
            this.addText(obj.text, obj)
          } else {
            console.error('❌ Text object missing text property')
            return false
          }
          break
        
        case 'XPath':
        case 'line':
        case 'Line':      // Added capital L for Fabric.js Line objects
        case 'connector':
        case 'xconnector':
          console.log('🔗 Creating connector/line...')
          // For lines, we need x1, y1, x2, y2 or left, top, width, height
          const objExt = obj as Record<string, unknown>
          const x1 = objExt.x1 as number || obj.left || 0
          const y1 = objExt.y1 as number || obj.top || 0
          const x2 = objExt.x2 as number || (obj.left || 0) + (obj.width || 100)
          const y2 = objExt.y2 as number || (obj.top || 0) + (obj.height || 100)
          
          console.log(`🔗 Connector coordinates: (${x1},${y1}) to (${x2},${y2})`)
          this.addConnector(x1, y1, x2, y2)
          break

        case 'path':
          console.log('✏️ Skipping path object (drawing paths not fully supported yet)')
          return false
        
        default:
          console.warn(`❓ Unknown object type: ${objectType}`)
          console.log('🔍 Available canvas constructors:', Object.keys(this.canvas).filter(key => 
            typeof this.canvas![key] === 'function'
          ))
          
          // Try direct canvas object creation as fallback
          if (this.canvas.add && obj.objType) {
            try {
              console.log('🔄 Attempting direct canvas object creation...')
              const ObjectConstructor = this.canvas[obj.objType] as new (props: Record<string, unknown>) => unknown
              if (ObjectConstructor) {
                const canvasObj = new ObjectConstructor(obj)
                this.addToCanvas(canvasObj)
                console.log('✅ Direct object creation successful')
              } else {
                console.error('❌ Constructor not found for', obj.objType)
                return false
              }
            } catch (directError) {
              console.error('❌ Direct object creation failed:', directError)
              return false
            }
          } else {
            return false
          }
      }
      
      // Verify object was actually added
      const afterCount = this.getObjectCount()
      console.log(`📊 Object count after creation: ${afterCount}`)
      
      if (afterCount > beforeCount) {
        console.log('✅ Object successfully added to canvas')
        return true
      } else {
        console.error('❌ Object was not added to canvas (count unchanged)')
        return false
      }
      
    } catch (error) {
      console.error(`💥 Failed to recreate ${obj.objType || obj.type} object:`, error)
      console.error('🔍 Error details:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        objectData: obj,
        canvasState: {
          hasCanvas: !!this.canvas,
          objectCount: this.getObjectCount()
        }
      })
      return false
    }
  }
}