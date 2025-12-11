import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({ title: '文生视频', type: 'llm' })
export class LlmTextToVideoAst extends Ast {

    @Input({ mode: IS_MULTI | IS_BUFFER, title: '文本' })
    prompt: string[] = [];

    @Output({ title: '视频' })
    video: string = ``;

    type: `LlmTextToVideoAst` = `LlmTextToVideoAst`
}
