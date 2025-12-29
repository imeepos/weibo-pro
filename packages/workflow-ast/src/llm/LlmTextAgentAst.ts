import { Ast, Input, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({
    title: '文字大模型',
    type: 'llm',
    errorStrategy: 'retry',
    maxRetries: 5,
    retryDelay: 1000,
    retryBackoff: 2
})
export class LlmTextAgentAst extends Ast {

    @Input({ title: '系统提示词', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
    system: string[] = [];

    @Input({ title: '用户提示词', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
    prompt: string[] = [];

    @Input({ title: '温度', defaultValue: 0.5 })
    temperature: number = 0.5;

    @Input({ title: '模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
    model: string = `deepseek-ai/DeepSeek-V3.2`;

    @Output({ title: '输出', defaultValue: '' })
    text = ``

    @Output({ title: '节点名', defaultValue: '' })
    username = ``

    @Output({ title: '节点介绍', defaultValue: '' })
    profile = ``

    type: `LlmTextAgentAst` = `LlmTextAgentAst`
}