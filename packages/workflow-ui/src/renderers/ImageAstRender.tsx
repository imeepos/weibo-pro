import { Injectable, root } from "@sker/core";
import { Render } from "@sker/workflow";
import { ImageAst } from "@sker/workflow";
import type { Annotation, CropArea } from "@sker/ui/components/ui/image-editor";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { UploadController } from "@sker/sdk";
import { ImageEditor } from "@sker/ui/components/ui/image-editor";
import { Button } from "@sker/ui/components/ui/button";
import { Upload, X } from "lucide-react";
import { cn } from "@sker/ui/lib/utils";
import { useReactFlow } from "@xyflow/react";
import { processAndUploadImage } from "./image-render-utils";

/**
 * 图片节点渲染组件
 */
const ImageComponent: React.FC<{ ast: ImageAst }> = ({ ast }) => {
    const [showEditor, setShowEditor] = useState(false);
    const [updateKey, setUpdateKey] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { setNodes } = useReactFlow();

    // 调试日志
    useEffect(() => {
        console.log('[ImageAstRender] ast.uploadedImage 更新:', ast.uploadedImage);
        console.log('[ImageAstRender] ast.image 更新:', ast.image);
    }, [ast.uploadedImage, ast.image]);

    // 临时编辑状态（不保存到 AST）
    const [tempAnnotations, setTempAnnotations] = useState<Annotation[]>([]);
    const [tempCropArea, setTempCropArea] = useState<CropArea | null>(null);

    // 更新节点数据（只更新 React Flow 状态，useWorkflow 会自动同步到 AST）
    const updateNodeData = useCallback((updates: Partial<ImageAst>) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === ast.id
                    ? { ...node, data: { ...node.data, ...updates } }
                    : node
            )
        );
    }, [ast.id, setNodes]);

    useEffect(() => {
        if (!ast.uploadedImage) {
            // 当图片清空时，重置临时编辑状态
            setTempAnnotations([]);
            setTempCropArea(null);
        }
    }, [ast.uploadedImage]);

    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const uploadFile = useCallback(async (file: File) => {
        setIsUploading(true);
        setProgress(0);

        try {
            const controller = root.get(UploadController);
            const formData = new FormData();
            formData.append('file', file);

            const result = await controller.uploadFile(formData);
            console.log('✅ 上传成功:', result);
            updateNodeData({ uploadedImage: result.url });
            setUpdateKey(prev => prev + 1);
        } catch (error) {
            console.error('❌ 图片上传失败:', error);
            alert(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            setIsUploading(false);
            setProgress(0);
        }
    }, [updateNodeData]);

    const getCurrentImage = () => {
        // 图片来源优先级：
        // 1. image（@Output）- 上游节点通过边传递或工作流运行时更新
        // 2. uploadedImage（@Input）- 用户在节点中手动上传
        return ast.image || ast.uploadedImage || '';
    };

    const currentImage = getCurrentImage();

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
        updateNodeData({ uploadedImage: '' });
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

    const handleEditorSave = async (data: { annotations?: Annotation[], crop?: CropArea }) => {
        setTempAnnotations(data.annotations || []);
        setTempCropArea(data.crop || null);

        // 如果有标注或裁剪，生成新图片
        if ((data.annotations && data.annotations.length > 0) || data.crop) {
            try {
                const newImageUrl = await processAndUploadImage(currentImage, data.annotations || [], data.crop || null);
                updateNodeData({ uploadedImage: newImageUrl });
                // 图片处理完成后，清空临时编辑状态
                setTempAnnotations([]);
                setTempCropArea(null);
                setUpdateKey(prev => prev + 1);
            } catch (error) {
                console.error('❌ 图片处理失败:', error);
                alert(`图片处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
            }
        }

        setShowEditor(false);
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
    render(ast: ImageAst, _ctx: any) {
        return <ImageComponent ast={ast} />;
    }
}
