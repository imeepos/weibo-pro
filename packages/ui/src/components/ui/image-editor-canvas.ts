import type { Annotation, CropArea } from './image-editor-types'

/** 绘制箭头标注 */
export const drawArrow = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
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

/** 在画布上绘制图片、裁剪遮罩与标注 */
export const drawImageWithAnnotations = (
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  anns: Annotation[],
  crop: CropArea | null
) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  // 绘制裁剪遮罩
  if (crop) {
    const shape = crop.shape || 'rect'

    // 绘制半透明黑色遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 保存上下文状态
    ctx.save()

    if (shape === 'circle') {
      // 圆形裁剪
      const centerX = crop.x + crop.width / 2
      const centerY = crop.y + crop.height / 2
      const radiusX = Math.abs(crop.width / 2)
      const radiusY = Math.abs(crop.height / 2)

      // 创建圆形路径并裁剪
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
      ctx.clip()

      // 清除遮罩并重新绘制图片
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // 恢复上下文以绘制边框
      ctx.restore()

      // 绘制圆形边框
      ctx.strokeStyle = 'hsl(var(--primary))'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.setLineDash([])
    } else {
      // 矩形裁剪（原有逻辑）
      ctx.clearRect(crop.x, crop.y, crop.width, crop.height)
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, crop.x, crop.y, crop.width, crop.height)

      // 绘制矩形边框
      ctx.strokeStyle = 'hsl(var(--primary))'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(crop.x, crop.y, crop.width, crop.height)
      ctx.setLineDash([])

      ctx.restore()
    }
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
}

/** 将鼠标事件坐标转换为画布内部坐标 */
export const getCanvasCoords = (
  canvas: HTMLCanvasElement,
  e: { clientX: number; clientY: number }
) => {
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  return { x, y }
}
