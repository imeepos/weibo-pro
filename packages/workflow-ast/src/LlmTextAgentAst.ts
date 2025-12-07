import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";


@Node({ title: '文字大模型', type: 'llm' })
export class LlmTextAgentAst extends Ast {

    @Input({ title: '系统提示词', type: 'textarea', mode: IS_MULTI })
    system: string[] = [];

    @Input({ title: '用户提示词', type: 'textarea', mode: IS_MULTI })
    prompt: string[] = [];

    @Input({ title: '温度' })
    temperature: number = 0.5;

    @Input({ title: '模型' })
    model: string = `deepseek-ai/DeepSeek-V3.2-Exp`;

    @Output({ title: '输出' })
    text: string = ``;

    @Output({ title: '节点名' })
    username: string = ``

    @Output({ title: '节点介绍' })
    profile: string = ``

    type: `LlmTextAgentAst` = `LlmTextAgentAst`
}