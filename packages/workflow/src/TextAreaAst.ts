import { Ast } from "./ast";
import { Input, Node, Output, IS_MULTI } from "./decorator";

@Node({ title: '文本节点', type: 'basic' })
export class TextAreaAst extends Ast {

    // 使用 IS_MULTI 聚合多条边的数据
    // 旧语法 isMulti: true 仍然有效（向后兼容）
    @Input({ title: '输入', mode: IS_MULTI })
    input: string[] | string = ``

    @Output({ title: '输出' })
    output: string = ``;

    type: `TextAreaAst` = `TextAreaAst`
}