import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({ title: '多图生视频' })
export class LlmTextImageToVideoAst extends Ast {

    @Input({ mode: IS_MULTI | IS_BUFFER, title: '文本' })
    prompt: string[] = [];

    @Input({ mode: IS_MULTI | IS_BUFFER, title: '图片' })
    images: string[] = [];

    @Output()
    video: string = ``;

    type: `LlmTextImageToVideoAst` = `LlmTextImageToVideoAst`
}
