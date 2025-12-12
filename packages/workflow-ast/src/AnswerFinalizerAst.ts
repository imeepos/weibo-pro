import { Ast, Input, Node, Output } from "@sker/workflow";
import { BehaviorSubject } from "rxjs";

@Node({
    title: '答案终稿器',
    type: 'llm',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 1000,
    retryBackoff: 2
})
export class AnswerFinalizerAst extends Ast {

    @Input({ title: 'Markdown 初稿', type: 'textarea' })
    markdown: string = '';

    @Output({ title: '润色后内容' })
    finalized: BehaviorSubject<string> = new BehaviorSubject<string>('');

    type: 'AnswerFinalizerAst' = 'AnswerFinalizerAst';
}
