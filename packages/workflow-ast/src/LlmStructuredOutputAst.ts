import { Ast, Input, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({
    title: '结构化输出',
    type: 'llm',
    dynamicOutputs: true,
    dynamicInputs: true,
    errorStrategy: 'retry',
    maxRetries: 5,
    retryDelay: 1000,
    retryBackoff: 2
})
export class LlmStructuredOutputAst extends Ast {

    @Input({ title: '系统提示词', type: 'textarea', mode: IS_MULTI })
    system: string[] = [];

    @Input({ title: '用户提示词', type: 'textarea', mode: IS_MULTI })
    prompt: string[] = [];

    @Input({ title: '温度' })
    temperature: number = 0;

    @Input({ title: '模型' })
    model: string = `deepseek-ai/DeepSeek-V3.2`;

    type: `LlmStructuredOutputAst` = `LlmStructuredOutputAst`
}
