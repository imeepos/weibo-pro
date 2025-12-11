import { BehaviorSubject } from "rxjs";
import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({ title: '首尾帧视频', type: 'llm' })
export class LlmTextImage2ToVideoAst extends Ast {

    @Input({ mode: IS_MULTI | IS_BUFFER, title: '文本' })
    prompt: string[] = [];

    @Input({ title: '首帧图' })
    first_image: BehaviorSubject<string> = new BehaviorSubject<string>(``)

    @Input({ title: '尾帧图' })
    last_image: BehaviorSubject<string> = new BehaviorSubject<string>(``)

    @Output({ title: '视频' })
    video: BehaviorSubject<string> = new BehaviorSubject<string>(``)

    type: `LlmTextImage2ToVideoAst` = `LlmTextImage2ToVideoAst`
}
