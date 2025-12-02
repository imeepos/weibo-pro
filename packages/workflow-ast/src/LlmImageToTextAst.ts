import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({ title: '图生文', type: 'llm' })
export class LlmImageToTextAst extends Ast {

    @Input({ title: '图片', mode: IS_MULTI | IS_BUFFER })
    images: string[] = [];

    @Output()
    text: string = ``;

    type: `LlmImageToTextAst` = `LlmImageToTextAst`
}
