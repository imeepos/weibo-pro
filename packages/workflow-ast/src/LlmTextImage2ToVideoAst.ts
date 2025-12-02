import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({ title: '首尾帧视频' })
export class LlmTextImage2ToVideoAst extends Ast {

    @Input({ mode: IS_MULTI | IS_BUFFER, title: '文本' })
    prompt: string[] = [];

    @Input({ title: '首帧图' })
    first_image: string = ``;

    @Input({ title: '尾帧图' })
    last_image: string = ``;

    @Output()
    video: string = ``;

    type: `LlmTextImage2ToVideoAst` = `LlmTextImage2ToVideoAst`
}
