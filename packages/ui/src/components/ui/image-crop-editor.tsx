"use client"

import * as React from "react"
import { Button } from "./button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog"
import { cn } from "@sker/ui/lib/utils"

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

interface ImageCropEditorProps {
  imageUrl: string
  initialCrop?: CropArea | null
  onSave: (crop: CropArea) => void
  onClose: () => void
  open?: boolean
}

export const ImageCropEditor = React.forwardRef<
  HTMLCanvasElement,
  ImageCropEditorProps
>(({ imageUrl, initialCrop = null, onSave, onClose, open = true }, ref) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [image, setImage] = React.useState<HTMLImageElement | null>(null)
  const [cropArea, setCropArea] = React.useState<CropArea | null>(initialCrop)
  const [isSelecting, setIsSelecting] = React.useState(false)
  const [startPos, setStartPos] = React.useState({ x: 0, y: 0 })
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
        redraw(img, initialCrop, scaleToFit)
      }
    }
    img.src = imageUrl
  }, [imageUrl, initialCrop])

  const redraw = React.useCallback((img: HTMLImageElement, crop: CropArea | null, currentScale: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    if (crop) {
      // 绘制半透明遮罩层
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 清除裁剪区域以显示原图
      ctx.clearRect(
        crop.x * currentScale,
        crop.y * currentScale,
        crop.width * currentScale,
        crop.height * currentScale
      )
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        crop.x * currentScale,
        crop.y * currentScale,
        crop.width * currentScale,
        crop.height * currentScale
      )

      // 绘制裁剪边框
      ctx.strokeStyle = 'hsl(var(--primary))'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(
        crop.x * currentScale,
        crop.y * currentScale,
        crop.width * currentScale,
        crop.height * currentScale
      )
      ctx.setLineDash([])
    }
  }, [])

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
    setIsSelecting(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !image) return

    const { x, y } = getCanvasCoords(e)
    const tempCrop: CropArea = {
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y)
    }

    redraw(image, tempCrop, scale)
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !image) return

    const { x, y } = getCanvasCoords(e)
    const newCrop: CropArea = {
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y)
    }

    setCropArea(newCrop)
    redraw(image, newCrop, scale)
    setIsSelecting(false)
  }

  const handleReset = () => {
    setCropArea(null)
    if (image) {
      redraw(image, null, scale)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>裁剪图片</DialogTitle>
        </DialogHeader>

        <div className="space-y-2" data-slot="crop-editor">
          <div
            className={cn(
              "overflow-auto rounded-lg border",
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

          {cropArea && (
            <div className="text-sm text-muted-foreground" data-slot="crop-info">
              裁剪区域: {Math.round(cropArea.width)} × {Math.round(cropArea.height)} px
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          {cropArea && (
            <Button variant="outline" onClick={handleReset}>重置</Button>
          )}
          <Button onClick={() => cropArea && onSave(cropArea)} disabled={!cropArea}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

ImageCropEditor.displayName = "ImageCropEditor"
