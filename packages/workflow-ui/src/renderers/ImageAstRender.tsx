import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { ImageAst } from "@sker/workflow-ast";
import type { Annotation, CropArea } from "@sker/ui/components/ui/image-editor";
import React, { useState, useEffect, useRef } from "react";
import { useUploadFile } from "@sker/ui/hooks/use-upload-file";
import { ImageEditor } from "@sker/ui/components/ui/image-editor";
import { Button } from "@sker/ui/components/ui/button";
import { Upload, X } from "lucide-react";
import { cn } from "@sker/ui/lib/utils";

/**
 * 图片节点渲染组件
 */
const ImageComponent: React.FC<{ ast: ImageAst }> = ({ ast }) => {
    const [showEditor, setShowEditor] = useState(false);
    const [updateKey, setUpdateKey] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 临时编辑状态（不保存到 AST）
    const [tempAnnotations, setTempAnnotations] = useState<Annotation[]>([]);
    const [tempCropArea, setTempCropArea] = useState<CropArea | null>(null);

    useEffect(() => {
        if (!ast.uploadedImage) {
            // 当图片清空时，重置临时编辑状态
            setTempAnnotations([]);
            setTempCropArea(null);
        }
    }, [ast.uploadedImage]);

    const { isUploading, progress, uploadFile } = useUploadFile({
        endpoint: '/api/upload/file',
        onSuccess: (file) => {
            console.log('✅ 上传成功:', file);
            ast.uploadedImage = file.url;
            setUpdateKey(prev => prev + 1);
        },
        onError: (error) => {
            console.error('❌ 图片上传失败:', error);
            alert(`上传失败: ${error.message}`);
        }
    });

    const getCurrentImage = () => {
        // uploadedImage 可能来自：
        // 1. 用户在节点中手动上传
        // 2. 上游节点通过边传递过来
        return ast.uploadedImage || '';
    };

    const currentImage = getCurrentImage();

    console.log('🖼️ 当前渲染状态:', {
        currentImage,
        uploadedImage: ast.uploadedImage,
        isUploading,
        updateKey
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        console.log('📁 选择的文件:', file);

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        console.log('📤 开始上传:', { name: file.name, size: file.size, type: file.type });
        await uploadFile(file);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleDelete = () => {
        ast.uploadedImage = '';
        setTempAnnotations([]);
        setTempCropArea(null);
        setShowEditor(false);
        setUpdateKey(prev => prev + 1);
    };

    const handleImageClick = () => {
        if (currentImage) {
            setShowEditor(true);
        }
    };

    /**
     * 处理图片并上传
     * 裁剪优先级最高：先在原图上渲染标注，再裁剪出指定区域
     */
    const processAndUploadImage = async (
        sourceImageUrl: string,
        annotations: Annotation[],
        cropArea: CropArea | null
    ): Promise<string> => {
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
    };

    /**
     * 加载图片
     */
    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = src;
        });
    };

    /**
     * 应用标注到画布
     */
    const applyAnnotations = (ctx: CanvasRenderingContext2D, annotations: Annotation[]) => {
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
    };

    /**
     * 绘制箭头
     */
    const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
        const headlen = 15;
        const angle = Math.atan2(y2 - y1, x2 - x1);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    };

    /**
     * 上传 Canvas 图片到服务器
     */
    const uploadCanvasImage = async (canvas: HTMLCanvasElement): Promise<string> => {
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
        return result.data?.url || result.url;
    };

    const handleEditorSave = async (data: { annotations?: Annotation[], crop?: CropArea }) => {
        setTempAnnotations(data.annotations || []);
        setTempCropArea(data.crop || null);

        // 如果有标注或裁剪，生成新图片
        if ((data.annotations && data.annotations.length > 0) || data.crop) {
            try {
                const newImageUrl = await processAndUploadImage(currentImage, data.annotations || [], data.crop || null);
                ast.uploadedImage = newImageUrl;
                // 图片处理完成后，清空临时编辑状态
                setTempAnnotations([]);
                setTempCropArea(null);
            } catch (error) {
                console.error('❌ 图片处理失败:', error);
                alert(`图片处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
            }
        }

        setShowEditor(false);
        setUpdateKey(prev => prev + 1);
    };

    return (
        <div className="p-4" key={updateKey}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            {!currentImage && !isUploading && (
                <Button
                    onClick={handleUploadClick}
                    className="w-full"
                >
                    <Upload />
                    上传图片
                </Button>
            )}

            {currentImage && (
                <div className="relative group">
                    <div
                        className={cn(
                            "relative border rounded-lg overflow-hidden",
                            "bg-muted/30 dark:bg-muted/10 cursor-pointer",
                            "hover:border-primary transition-colors"
                        )}
                        onClick={handleImageClick}
                    >
                        <img
                            src={currentImage}
                            alt="预览"
                            className="w-full h-auto max-h-64 object-contain"
                        />
                    </div>

                    <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleDelete}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {isUploading && (
                <div className="space-y-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                        上传中... {progress}%
                    </p>
                </div>
            )}

            {showEditor && currentImage && (
                <ImageEditor
                    imageUrl={currentImage}
                    initialAnnotations={tempAnnotations}
                    initialCrop={tempCropArea}
                    onSave={handleEditorSave}
                    onClose={() => setShowEditor(false)}
                />
            )}
        </div>
    );
};

@Injectable()
export class ImageAstRender {
    @Render(ImageAst)
    render(ast: ImageAst, ctx: any) {
        return <ImageComponent ast={ast} />;
    }
}
