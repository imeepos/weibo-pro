/**
 * 设计一个大模型分类节点
 */

import { Ast, Input, Node, Output } from "@sker/workflow";

@Node({ title: '分类器', type: 'llm' })
export class LlmCategoryAst extends Ast {
    @Input({ title: '上下文', isMulti: true })
    context: string[] = [];

    @Output({ title: '分类结果' })
    category: string = '';

    type: 'LlmCategoryAst' = 'LlmCategoryAst';
}
