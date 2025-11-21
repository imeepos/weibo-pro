import { Ast } from "./ast";
import { Input, Node, Output } from "./decorator";

@Node({ title: '文本节点' })
export class TextAreaAst extends Ast {

    @Input({ title: '输入' })
    input: string = ``

    @Output({ title: '输出' })
    output: string = ``;

    type: `TextAreaAst` = `TextAreaAst`
}