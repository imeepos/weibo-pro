import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node()
export class LlmTextToVideoAst extends Ast {

    @Input({ mode: IS_MULTI | IS_BUFFER, title: '文本' })
    prompt: string[] = [];

    @Output()
    video: string = ``;

    type: `LlmTextToVideoAst` = `LlmTextToVideoAst`
}
