"use client"

import * as React from "react"
import { Button } from "./button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog"
import { Square, Circle, ArrowRight, Type, Trash2 } from "lucide-react"
import { cn } from "@sker/ui/lib/utils"

export type AnnotationType = 'rect' | 'circle' | 'arrow' | 'text'

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
  lineWidth: number
}

interface ImageAnnotationEditorProps {
  imageUrl: string
  initialAnnotations?: Annotation[]
  onSave: (annotations: Annotation[]) => void
  onClose: () => void
  open?: boolean
}

export const ImageAnnotationEditor = React.forwardRef<
  HTMLCanvasElement,
  ImageAnnotationEditorProps
>(({ imageUrl, initialAnnotations = [], onSave, onClose, open = true }, ref) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [annotations, setAnnotations] = React.useState<Annotation[]>(initialAnnotations)
  const [currentTool, setCurrentTool] = React.useState<AnnotationType>('rect')
  const [isDrawing, setIsDrawing] = React.useState(false)
  const [startPos, setStartPos] = React.useState({ x: 0, y: 0 })
  const [image, setImage] = React.useState<HTMLImageElement | null>(null)
  const [scale, setScale] = React.useState(1)

  React.useEffect(() => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      setImage(img)
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const containerWidth = canvas.parentElement?.clientWidth || 800
        const scaleToFit = Math.min(containerWidth / img.width, 1)

        setScale(scaleToFit)
        canvas.width = img.width * scaleToFit
        canvas.height = img.height * scaleToFit
        redraw(img, initialAnnotations, scaleToFit)
      }
    }
    img.src = imageUrl
  }, [imageUrl, initialAnnotations])

  const redraw = React.useCallback((img: HTMLImageElement, anns: Annotation[], currentScale: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    anns.forEach(ann => {
      ctx.strokeStyle = ann.color
      ctx.fillStyle = ann.color
      ctx.lineWidth = (ann.lineWidth || 3) * currentScale

      const scaledAnn = {
        ...ann,
        x: ann.x * currentScale,
        y: ann.y * currentScale,
        width: ann.width ? ann.width * currentScale : undefined,
        height: ann.height ? ann.height * currentScale : undefined,
        endX: ann.endX ? ann.endX * currentScale : undefined,
        endY: ann.endY ? ann.endY * currentScale : undefined,
      }

      switch (ann.type) {
        case 'rect':
          if (scaledAnn.width && scaledAnn.height) {
            ctx.strokeRect(scaledAnn.x, scaledAnn.y, scaledAnn.width, scaledAnn.height)
          }
          break
        case 'circle':
          if (scaledAnn.width && scaledAnn.height) {
            ctx.beginPath()
            ctx.ellipse(
              scaledAnn.x + scaledAnn.width / 2,
              scaledAnn.y + scaledAnn.height / 2,
              Math.abs(scaledAnn.width / 2),
              Math.abs(scaledAnn.height / 2),
              0, 0, 2 * Math.PI
            )
            ctx.stroke()
          }
          break
        case 'arrow':
          if (scaledAnn.endX !== undefined && scaledAnn.endY !== undefined) {
            drawArrow(ctx, scaledAnn.x, scaledAnn.y, scaledAnn.endX, scaledAnn.endY, currentScale)
          }
          break
        case 'text':
          if (ann.text) {
            ctx.font = `${20 * currentScale}px Arial`
            ctx.fillText(ann.text, scaledAnn.x, scaledAnn.y)
          }
          break
      }
    })
  }, [])

  const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, currentScale: number) => {
    const headlen = 15 * currentScale
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
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale
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
        if (image) redraw(image, newAnns, scale)
      }
      setIsDrawing(false)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !image || currentTool === 'text') return

    const { x, y } = getCanvasCoords(e)
    const tempAnn: Annotation = {
      type: currentTool,
      x: startPos.x, y: startPos.y,
      width: x - startPos.x,
      height: y - startPos.y,
      endX: x, endY: y,
      color: '#ff0000',
      lineWidth: 3
    }

    redraw(image, [...annotations, tempAnn], scale)
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentTool === 'text' || !image) return

    const { x, y } = getCanvasCoords(e)
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
    redraw(image, newAnns, scale)
    setIsDrawing(false)
  }

  const handleUndo = () => {
    if (annotations.length === 0 || !image) return
    const newAnns = annotations.slice(0, -1)
    setAnnotations(newAnns)
    redraw(image, newAnns, scale)
  }

  const tools = [
    { type: 'rect' as const, icon: Square, title: '矩形' },
    { type: 'circle' as const, icon: Circle, title: '圆形' },
    { type: 'arrow' as const, icon: ArrowRight, title: '箭头' },
    { type: 'text' as const, icon: Type, title: '文字' },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>标注图片</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 overflow-hidden" data-slot="annotation-editor">
          <div className="flex flex-col gap-2" data-slot="tool-panel">
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
            <Button
              size="icon"
              variant="outline"
              onClick={handleUndo}
              title="撤销"
              disabled={annotations.length === 0}
            >
              <Trash2 />
            </Button>
          </div>

          <div
            className={cn(
              "flex-1 overflow-auto rounded-lg border",
              "bg-muted/30 dark:bg-muted/10"
            )}
            data-slot="canvas-container"
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="cursor-crosshair"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => onSave(annotations)}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

ImageAnnotationEditor.displayName = "ImageAnnotationEditor"
