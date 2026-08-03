import { root } from '@sker/core'
import { UploadController } from '@sker/sdk'
import type { Annotation, CropArea } from '@sker/ui/components/ui/image-editor'

/**
 * 加载图片
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = src;
  });
}

/**
 * 绘制箭头
 */
export function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  const headlen = 15;
  const angle = Math.atan2(y2 - y1, x2 - x1);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

/**
 * 应用标注到画布
 */
export function applyAnnotations(ctx: CanvasRenderingContext2D, annotations: Annotation[]) {
  annotations.forEach(ann => {
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = ann.lineWidth || 3;

    switch (ann.type) {
      case 'rect':
        if (ann.width && ann.height) {
          ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
        }
        break;

      case 'circle':
        if (ann.width && ann.height) {
          ctx.beginPath();
          ctx.ellipse(
            ann.x + ann.width / 2,
            ann.y + ann.height / 2,
            Math.abs(ann.width / 2),
            Math.abs(ann.height / 2),
            0, 0, 2 * Math.PI
          );
          ctx.stroke();
        }
        break;

      case 'arrow':
        if (ann.endX !== undefined && ann.endY !== undefined) {
          drawArrow(ctx, ann.x, ann.y, ann.endX, ann.endY);
        }
        break;

      case 'text':
        if (ann.text) {
          ctx.font = '20px Arial';
          ctx.fillText(ann.text, ann.x, ann.y);
        }
        break;
    }
  });
}

/**
 * 上传 Canvas 图片到服务器
 */
export async function uploadCanvasImage(canvas: HTMLCanvasElement): Promise<string> {
  const base64Image = canvas.toDataURL('image/png');

  const controller = root.get(UploadController);
  const result = await controller.uploadBase64({
    image: base64Image,
    filename: `image-${Date.now()}.png`,
  });

  return result.url;
}

/**
 * 处理图片并上传
 * 裁剪优先级最高：先在原图上渲染标注，再裁剪出指定区域
 */
export async function processAndUploadImage(
  sourceImageUrl: string,
  annotations: Annotation[],
  cropArea: CropArea | null
): Promise<string> {
  // 加载图片
  const img = await loadImage(sourceImageUrl);

  // 步骤1：创建原图大小的临时画布，绘制图片和标注
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  const tempCtx = tempCanvas.getContext('2d')!;

  // 绘制原图
  tempCtx.drawImage(img, 0, 0);

  // 在原图上绘制标注（使用原始坐标）
  if (annotations && annotations.length > 0) {
    applyAnnotations(tempCtx, annotations);
  }

  // 步骤2：根据是否裁剪，生成最终画布
  let finalCanvas: HTMLCanvasElement;
  let finalCtx: CanvasRenderingContext2D;

  if (cropArea) {
    // 创建裁剪后大小的画布
    finalCanvas = document.createElement('canvas');
    finalCanvas.width = cropArea.width;
    finalCanvas.height = cropArea.height;
    finalCtx = finalCanvas.getContext('2d')!;

    // 从临时画布裁剪指定区域到最终画布
    finalCtx.drawImage(
      tempCanvas,
      cropArea.x, cropArea.y, cropArea.width, cropArea.height,
      0, 0, cropArea.width, cropArea.height
    );
  } else {
    // 无裁剪，直接使用临时画布
    finalCanvas = tempCanvas;
  }

  // 上传图片到服务器
  const imageUrl = await uploadCanvasImage(finalCanvas);
  return imageUrl;
}
