import { Ast, Input, IS_MULTI, Node, Output, State } from "@sker/workflow";

/**
 * 代码生成节点 - Spec-Kit Implement 阶段核心节点
 *
 * 根据任务描述和上下文生成代码，支持：
 * - 多文件生成
 * - 增量修改
 * - 代码审查反馈循环
 */
@Node({
    title: '代码生成器',
    type: 'llm',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoff: 2
})
export class CodeGeneratorAst extends Ast {
    @Input({ title: '任务描述', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
    tasks: string[] = [];

    @Input({ title: '技术栈', type: 'text', defaultValue: '' })
    techStack: string = '';

    @Input({ title: '项目上下文', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
    context: string[] = [];

    @Input({ title: '现有代码', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
    existingCode: string[] = [];

    @Input({ title: '温度', defaultValue: 0.2 })
    temperature: number = 0.2;

    @Input({ title: '模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
    model: string = 'deepseek-ai/DeepSeek-V3.2';

    @State({ title: '当前任务索引' })
    currentTaskIndex: number = 0;

    @Output({ title: '生成的代码', defaultValue: '' })
    generatedCode: string = '';

    @Output({ title: '文件路径', defaultValue: '' })
    filePath: string = '';

    @Output({ title: '操作类型', defaultValue: 'create' })
    operation: 'create' | 'modify' | 'delete' = 'create';

    @Output({ title: '是否完成', defaultValue: false })
    isComplete: boolean = false;

    type = 'CodeGeneratorAst';
}
