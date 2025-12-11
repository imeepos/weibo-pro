import { BehaviorSubject } from "rxjs";
import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({ title: '多图生视频', type: 'llm' })
export class LlmTextImageToVideoAst extends Ast {

    @Input({ mode: IS_MULTI | IS_BUFFER, title: '文本' })
    prompt: string[] = [];

    @Input({ mode: IS_MULTI | IS_BUFFER, title: '图片' })
    images: string[] = [];

    @Output({ title: '视频' })
    video: BehaviorSubject<string> = new BehaviorSubject<string>(``)

    type: `LlmTextImageToVideoAst` = `LlmTextImageToVideoAst`
}
