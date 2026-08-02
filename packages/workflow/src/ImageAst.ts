import { Ast } from "./ast";
import { Input, Node, Output } from "./decorator";
@Node({ title: '图片', type: 'basic' })
export class ImageAst extends Ast {
    @Input({ title: '输入', type: 'image', defaultValue: '' })
    uploadedImage: string = '';

    @Output({ title: '输出', defaultValue: '' })
    image = ``;

    type = 'ImageAst';
}
