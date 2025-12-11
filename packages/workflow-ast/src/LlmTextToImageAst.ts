import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({
    title: '文生图',
    type: 'llm',
    errorStrategy: 'retry',
    maxRetries: 5,
    retryDelay: 1000,
    retryBackoff: 2
})
export class LlmTextToImageAst extends Ast {

    @Input({ mode: IS_MULTI | IS_BUFFER, title: '文本' })
    text: string[] = [];

    @Output({ title: '图片' })
    image: string = ``;

    type: `LlmTextToImageAst` = `LlmTextToImageAst`
}
