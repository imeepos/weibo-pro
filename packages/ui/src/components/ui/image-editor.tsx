"use client"

import * as React from "react"
import { Button } from "./button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog"
import { Square, Circle, ArrowRight, Type, Trash2, Crop, Save } from "lucide-react"
import { cn } from "@sker/ui/lib/utils"

export type AnnotationType = 'rect' | 'circle' | 'arrow' | 'text'
export type ToolType = AnnotationType | 'crop'

export interface Annotation {
  type: AnnotationType
  x: number
  y: number
  width?: number
  height?: number
  endX?: number
  endY?: number
  text?: string
  color: string
  lineWidth?: number
}

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

interface ImageEditorProps {
  imageUrl: string
  initialAnnotations?: Annotation[]
  initialCrop?: CropArea | null
  onSave?: (data: { annotations?: Annotation[], crop?: CropArea }) => void
  onClose: () => void
  open?: boolean
}

export const ImageEditor = React.forwardRef<HTMLCanvasElement, ImageEditorProps>(
  ({ imageUrl, initialAnnotations = [], initialCrop = null, onSave, onClose, open = true }, ref) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const [currentTool, setCurrentTool] = React.useState<ToolType>('rect')
    const [annotations, setAnnotations] = React.useState<Annotation[]>(initialAnnotations)
    const [cropArea, setCropArea] = React.useState<CropArea | null>(initialCrop)
    const [isDrawing, setIsDrawing] = React.useState(false)
    const [startPos, setStartPos] = React.useState({ x: 0, y: 0 })
    const [image, setImage] = React.useState<HTMLImageElement | null>(null)

    React.useEffect(() => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        setImage(img)

        if (canvasRef.current) {
          const canvas = canvasRef.current
          canvas.width = img.width
          canvas.height = img.height
          redraw(img, initialAnnotations, initialCrop)
        }
      }
      img.src = imageUrl
    }, [imageUrl, initialAnnotations, initialCrop])

    const redraw = React.useCallback((img: HTMLImageElement, anns: Annotation[], crop: CropArea | null) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // 绘制裁剪遮罩
      if (crop) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.clearRect(crop.x, crop.y, crop.width, crop.height)
        ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, crop.x, crop.y, crop.width, crop.height)
        ctx.strokeStyle = 'hsl(var(--primary))'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(crop.x, crop.y, crop.width, crop.height)
        ctx.setLineDash([])
      }

      // 始终绘制标注（不受模式限制）
      anns.forEach(ann => {
        ctx.strokeStyle = ann.color
        ctx.fillStyle = ann.color
        ctx.lineWidth = ann.lineWidth || 3

        switch (ann.type) {
          case 'rect':
            if (ann.width && ann.height) {
              ctx.strokeRect(ann.x, ann.y, ann.width, ann.height)
            }
            break
          case 'circle':
            if (ann.width && ann.height) {
              ctx.beginPath()
              ctx.ellipse(
                ann.x + ann.width / 2,
                ann.y + ann.height / 2,
                Math.abs(ann.width / 2),
                Math.abs(ann.height / 2),
                0, 0, 2 * Math.PI
              )
              ctx.stroke()
            }
            break
          case 'arrow':
            if (ann.endX !== undefined && ann.endY !== undefined) {
              drawArrow(ctx, ann.x, ann.y, ann.endX, ann.endY)
            }
            break
          case 'text':
            if (ann.text) {
              ctx.font = '20px Arial'
              ctx.fillText(ann.text, ann.x, ann.y)
            }
            break
        }
      })
    }, [])

    const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
      const headlen = 15
      const angle = Math.atan2(y2 - y1, x2 - x1)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6))
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6))
      ctx.stroke()
    }

    const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      return { x, y }
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e)
      setStartPos({ x, y })
      setIsDrawing(true)

      if (currentTool === 'text') {
        const text = prompt('输入文字:')
        if (text) {
          const newAnn: Annotation = {
            type: 'text',
            x, y, text,
            color: '#ff0000',
            lineWidth: 3
          }
          const newAnns = [...annotations, newAnn]
          setAnnotations(newAnns)
          if (image) redraw(image, newAnns, cropArea)
        }
        setIsDrawing(false)
      }
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !image) return

      const { x, y } = getCanvasCoords(e)

      if (currentTool === 'crop') {
        const tempCrop: CropArea = {
          x: Math.min(startPos.x, x),
          y: Math.min(startPos.y, y),
          width: Math.abs(x - startPos.x),
          height: Math.abs(y - startPos.y)
        }
        redraw(image, annotations, tempCrop)
      } else if (currentTool !== 'text') {
        const tempAnn: Annotation = {
          type: currentTool,
          x: startPos.x, y: startPos.y,
          width: x - startPos.x,
          height: y - startPos.y,
          endX: x, endY: y,
          color: '#ff0000',
          lineWidth: 3
        }
        redraw(image, [...annotations, tempAnn], cropArea)
      }
    }

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !image) return

      const { x, y } = getCanvasCoords(e)

      if (currentTool === 'crop') {
        const newCrop: CropArea = {
          x: Math.min(startPos.x, x),
          y: Math.min(startPos.y, y),
          width: Math.abs(x - startPos.x),
          height: Math.abs(y - startPos.y)
        }
        setCropArea(newCrop)
        redraw(image, annotations, newCrop)
      } else if (currentTool !== 'text') {
        const newAnn: Annotation = {
          type: currentTool,
          x: startPos.x, y: startPos.y,
          width: x - startPos.x,
          height: y - startPos.y,
          endX: x, endY: y,
          color: '#ff0000',
          lineWidth: 3
        }
        const newAnns = [...annotations, newAnn]
        setAnnotations(newAnns)
        redraw(image, newAnns, cropArea)
      }

      setIsDrawing(false)
    }

    const handleUndo = () => {
      if (currentTool === 'crop' && cropArea && image) {
        setCropArea(null)
        redraw(image, annotations, null)
      } else if (annotations.length > 0 && image) {
        const newAnns = annotations.slice(0, -1)
        setAnnotations(newAnns)
        redraw(image, newAnns, cropArea)
      }
    }

    const handleSave = () => {
      onSave?.({
        annotations,
        crop: cropArea || undefined
      })
      onClose()
    }

    const tools = [
      { type: 'rect' as const, icon: Square, title: '矩形' },
      { type: 'circle' as const, icon: Circle, title: '圆形' },
      { type: 'arrow' as const, icon: ArrowRight, title: '箭头' },
      { type: 'text' as const, icon: Type, title: '文字' },
      { type: 'crop' as const, icon: Crop, title: '裁剪' },
    ]

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          className="p-0 max-w-[95vw] max-h-[95vh]"
        >
          <div className="flex flex-col h-full">
            <DialogHeader className="px-6 py-4 border-b shrink-0">
              <DialogTitle>图片编辑器</DialogTitle>
            </DialogHeader>

            <div className="flex flex-1 overflow-hidden">
              {/* 左侧工具栏 */}
              <div className="flex flex-col gap-2 p-4 border-r shrink-0 bg-muted/30">
                {tools.map(({ type, icon: Icon, title }) => (
                  <Button
                    key={type}
                    size="icon"
                    variant={currentTool === type ? 'default' : 'outline'}
                    onClick={() => setCurrentTool(type)}
                    title={title}
                  >
                    <Icon />
                  </Button>
                ))}

                {(annotations.length > 0 || cropArea) && (
                  <>
                    <div className="border-t my-2" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleUndo}
                      title="撤销"
                    >
                      <Trash2 />
                    </Button>
                  </>
                )}

                <div className="flex-1" />

                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleSave}
                  title="保存"
                >
                  <Save />
                </Button>
              </div>

              {/* Canvas 容器 */}
              <div className="flex-1 overflow-auto p-4 bg-muted/10 flex items-center justify-center" data-slot="canvas-scroll">
                <div className="border bg-muted/30 dark:bg-muted/10" data-slot="canvas-container">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    className="block rounded-none cursor-crosshair"
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
)

ImageEditor.displayName = "ImageEditor"
