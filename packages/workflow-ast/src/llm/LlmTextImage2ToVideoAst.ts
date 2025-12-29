import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({ title: '首尾帧视频', type: 'llm' })
export class LlmTextImage2ToVideoAst extends Ast {

    @Input({ mode: IS_MULTI | IS_BUFFER, title: '文本', defaultValue: [] })
    prompt: string[] = [];

    @Input({ title: '首帧图', defaultValue: '' })
    first_image: string = ``

    @Input({ title: '尾帧图', defaultValue: '' })
    last_image: string = ``

    @Output({ title: '视频', defaultValue: '' })
    video = ``

    type: `LlmTextImage2ToVideoAst` = `LlmTextImage2ToVideoAst`
}
