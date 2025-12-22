import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({ title: '多图生视频', type: 'llm' })
export class LlmTextImageToVideoAst extends Ast {

    @Input({ mode: IS_MULTI | IS_BUFFER, title: '文本', defaultValue: [] })
    prompt: string[] = [];

    @Input({ mode: IS_MULTI | IS_BUFFER, title: '图片', defaultValue: [] })
    images: string[] = [];

    @Output({ title: '视频', defaultValue: '' })
    video = ``

    type: `LlmTextImageToVideoAst` = `LlmTextImageToVideoAst`
}
