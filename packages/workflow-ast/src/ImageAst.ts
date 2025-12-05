import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

/**
 * 标注类型
 */
export type AnnotationType = 'text' | 'arrow' | 'rect' | 'circle';

/**
 * 标注数据
 */
export interface Annotation {
    type: AnnotationType;
    x: number;
    y: number;
    width?: number;
    height?: number;
    endX?: number;
    endY?: number;
    text?: string;
    color: string;
    lineWidth?: number;
}

/**
 * 裁剪区域
 */
export interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * 图片节点 - 支持上传、输入、预览、编辑和标注
 */
@Node({ title: '图片', type: 'basic' })
export class ImageAst extends Ast {
    @Input({ title: '图片输入', mode: IS_MULTI | IS_BUFFER })
    imageInputs: string[] = [];

    uploadedImage: string = '';

    annotations: Annotation[] = [];

    cropArea: CropArea | null = null;

    @Output({ title: '图片' })
    image: string = '';

    type: 'ImageAst' = 'ImageAst';
}
