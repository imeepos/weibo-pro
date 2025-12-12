import { BehaviorSubject } from "rxjs";
import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({
    title: '图生文',
    type: 'llm',
    errorStrategy: 'retry',
    maxRetries: 5,
    retryDelay: 1000,
    retryBackoff: 2
})
export class LlmImageToTextAst extends Ast {

    @Input({ title: '图片', mode: IS_MULTI })
    images: string[] = [];

    @Output({ title: '描述' })
    text: BehaviorSubject<string> = new BehaviorSubject<string>(``)

    type: `LlmImageToTextAst` = `LlmImageToTextAst`
}
