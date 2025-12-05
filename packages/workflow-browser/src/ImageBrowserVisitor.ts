import { Injectable, ErrorSerializer } from "@sker/core";
import { Handler } from "@sker/workflow";
import { ImageAst, Annotation, CropArea } from "@sker/workflow-ast";
import { Observable } from "rxjs";

/**
 * 图片节点浏览器端 Visitor - 使用浏览器 Canvas API 合成图片
 */
@Injectable()
export class ImageBrowserVisitor {
    @Handler(ImageAst)
    handler(ast: ImageAst, ctx: any) {
        return new Observable(obs => {
            this.processImage(ast, obs);
        });
    }

    private async processImage(ast: ImageAst, obs: any) {
        try {
            ast.state = 'running';
            obs.next({ ...ast });

            const sourceImage = this.getSourceImage(ast);
            if (!sourceImage) {
                ast.state = 'success';
                obs.next({ ...ast });
                obs.complete();
                return;
            }

            // 如果没有标注和裁剪，直接输出原图
            if (ast.annotations.length === 0 && !ast.cropArea) {
                ast.image = sourceImage;
                ast.state = 'success';
                obs.next({ ...ast });
                obs.complete();
                return;
            }

            ast.state = 'emitting';
            obs.next({ ...ast });

            // 加载图片
            const img = await this.loadImage(sourceImage);

            // 创建画布
            let canvas: HTMLCanvasElement;
            let ctx: CanvasRenderingContext2D;

            // 应用裁剪
            if (ast.cropArea) {
                canvas = this.applyCrop(img, ast.cropArea);
                ctx = canvas.getContext('2d')!;
            } else {
                canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
            }

            // 应用标注
            if (ast.annotations.length > 0) {
                this.applyAnnotations(ctx, ast.annotations);
            }

            // 上传图片到服务器
            const imageUrl = await this.uploadCanvasImage(canvas);
            ast.image = imageUrl;

            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
        } catch (error) {
            ast.state = 'fail';
            ast.error = ErrorSerializer.serialize(error);
            obs.next({ ...ast });
            obs.complete();
        }
    }

    /**
     * 获取源图片
     */
    private getSourceImage(ast: ImageAst): string {
        if (ast.uploadedImage) return ast.uploadedImage;

        let inputs = ast.imageInputs || [];
        if (Array.isArray(inputs) && inputs.length > 0 && Array.isArray(inputs[0])) {
            inputs = inputs.flat();
        }

        return inputs[0] || '';
    }

    /**
     * 加载图片
     */
    private loadImage(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = src;
        });
    }

    /**
     * 应用裁剪
     */
    private applyCrop(img: HTMLImageElement, crop: CropArea): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = crop.width;
        canvas.height = crop.height;

        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(
            img,
            crop.x, crop.y, crop.width, crop.height,
            0, 0, crop.width, crop.height
        );

        return canvas;
    }

    /**
     * 应用标注
     */
    private applyAnnotations(ctx: CanvasRenderingContext2D, annotations: Annotation[]) {
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
                        this.drawArrow(ctx, ann.x, ann.y, ann.endX, ann.endY);
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
     * 绘制箭头
     */
    private drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
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
     * 上传 Canvas 图片到服务器
     */
    private async uploadCanvasImage(canvas: HTMLCanvasElement): Promise<string> {
        const base64Image = canvas.toDataURL('image/png');

        const response = await fetch('/api/upload/base64', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: base64Image,
                filename: `image-${Date.now()}.png`,
            }),
        });

        if (!response.ok) {
            throw new Error(`图片上传失败: ${response.statusText}`);
        }

        const result = await response.json();
        return result.url;
    }
}
