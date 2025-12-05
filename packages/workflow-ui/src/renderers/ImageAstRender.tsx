import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { ImageAst } from "@sker/workflow-ast";
import type { Annotation, CropArea } from "@sker/workflow-ast";
import React, { useState, useEffect } from "react";
import { useUploadFile } from "@sker/ui/hooks/use-upload-file";
import {
    ImageAnnotationEditor,
    ImageCropEditor,
    ImageUploadPreview
} from "@sker/ui/components/ui";

/**
 * 图片节点渲染组件
 */
const ImageComponent: React.FC<{ ast: ImageAst }> = ({ ast }) => {
    const [showAnnotationEditor, setShowAnnotationEditor] = useState(false);
    const [showCropEditor, setShowCropEditor] = useState(false);

    useEffect(() => {
        if (!ast.annotations) {
            ast.annotations = [];
        }
        if (ast.cropArea === undefined) {
            ast.cropArea = null;
        }
    }, [ast]);

    const { isUploading, progress, uploadFile } = useUploadFile({
        onSuccess: (file) => {
            ast.uploadedImage = file.url;
        }
    });

    const getCurrentImage = () => {
        if (ast.uploadedImage) return ast.uploadedImage;

        let inputs = ast.imageInputs || [];
        if (Array.isArray(inputs) && inputs.length > 0 && Array.isArray(inputs[0])) {
            inputs = inputs.flat();
        }

        return inputs[0] || '';
    };

    const currentImage = getCurrentImage();

    const handleFileSelect = async (file: File) => {
        await uploadFile(file);
    };

    const handleAnnotationSave = (annotations: Annotation[]) => {
        ast.annotations = annotations;
        setShowAnnotationEditor(false);
    };

    const handleCropSave = (crop: CropArea) => {
        ast.cropArea = crop;
        setShowCropEditor(false);
    };

    return (
        <div className="p-4">
            <ImageUploadPreview
                imageUrl={currentImage}
                isUploading={isUploading}
                uploadProgress={progress}
                onFileSelect={handleFileSelect}
                onAnnotate={currentImage ? () => setShowAnnotationEditor(true) : undefined}
                onCrop={currentImage ? () => setShowCropEditor(true) : undefined}
                annotationCount={ast.annotations?.length ?? 0}
                hasCrop={!!ast.cropArea}
            />

            {showAnnotationEditor && currentImage && (
                <ImageAnnotationEditor
                    imageUrl={currentImage}
                    initialAnnotations={ast.annotations || []}
                    onSave={handleAnnotationSave}
                    onClose={() => setShowAnnotationEditor(false)}
                />
            )}

            {showCropEditor && currentImage && (
                <ImageCropEditor
                    imageUrl={currentImage}
                    initialCrop={ast.cropArea || null}
                    onSave={handleCropSave}
                    onClose={() => setShowCropEditor(false)}
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
