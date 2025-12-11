import { BehaviorSubject } from "rxjs";
import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({
    title: '视频解析',
    type: 'llm',
    errorStrategy: 'retry',
    maxRetries: 5,
    retryDelay: 1000,
    retryBackoff: 2
})
export class LlmVideoToTextAst extends Ast {

    @Input({ title: '视频', mode: IS_MULTI | IS_BUFFER })
    videos: string[] = [];

    @Output({ title: '描述' })
    text: BehaviorSubject<string> = new BehaviorSubject<string>(``)

    type: `LlmVideoToTextAst` = `LlmVideoToTextAst`
}
