/**
 * 设计一个大模型分类节点
 */

import { Ast, Input, Node } from "@sker/workflow";

@Node()
export class LlmCategoryAst extends Ast {
    @Input({ title: '上下文', isMulti: true })
    context: string[] = [];
}
