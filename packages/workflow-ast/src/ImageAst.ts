import { Ast, Input, Node, Output } from "@sker/workflow";
import { BehaviorSubject } from "rxjs";

/**
 * 图片节点 - 支持上传、输入、预览
 *
 * 设计说明：
 * - uploadedImage 既可以是用户上传的图片，也可以从上游节点接收图片 URL
 * - 支持通过边连接自动填充，也支持在 RunConfigDialog 中手动上传
 * - 裁剪和标注是 UI 层的临时编辑状态，最终生成新图片 URL 保存在 uploadedImage 中
 */
@Node({ title: '图片', type: 'basic' })
export class ImageAst extends Ast {
    @Input({ title: '输入', type: 'image' })
    uploadedImage: string = '';

    @Output({ title: '输出' })
    image: BehaviorSubject<string> = new BehaviorSubject<string>('');

    type: 'ImageAst' = 'ImageAst';
}
