import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { ImageAst } from "@sker/workflow-ast";
import type { Annotation, CropArea } from "@sker/workflow-ast";
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

    useEffect(() => {
        if (!ast.annotations) {
            ast.annotations = [];
        }
        if (ast.cropArea === undefined) {
            ast.cropArea = null;
        }
    }, [ast]);

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
        if (ast.uploadedImage) {
            console.log('📷 使用上传的图片:', ast.uploadedImage);
            return ast.uploadedImage;
        }

        let inputs = ast.imageInputs || [];
        if (Array.isArray(inputs) && inputs.length > 0 && Array.isArray(inputs[0])) {
            inputs = inputs.flat();
        }

        console.log('📷 使用输入的图片:', inputs[0] || '(无)');
        return inputs[0] || '';
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
        ast.annotations = [];
        ast.cropArea = null;
        setShowEditor(false);
        setUpdateKey(prev => prev + 1);
    };

    const handleImageClick = () => {
        if (currentImage) {
            setShowEditor(true);
        }
    };

    const handleEditorSave = (data: { annotations?: Annotation[], crop?: CropArea }) => {
        ast.annotations = data.annotations || [];
        ast.cropArea = data.crop || null;
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
                    initialAnnotations={ast.annotations || []}
                    initialCrop={ast.cropArea || null}
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
