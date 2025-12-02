import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({ title: '文生图' })
export class LlmTextToImageAst extends Ast {

    @Input({ mode: IS_MULTI | IS_BUFFER, title: '文本' })
    text: string[] = [];

    @Output()
    image: string = ``;

    type: `LlmTextToImageAst` = `LlmTextToImageAst`
}
