import { Ast, INode, Input, Node, Output, State } from "@sker/workflow";


@Node({ title: '文字大模型' })
export class LlmTextAgentAst extends Ast {

    @Input({ title: '系统提示词' })
    system: string = ``;

    @Input({ title: '用户提示词' })
    prompt: string = ``;

    @Input({ title: '温度' })
    temperature: number = 0.5;

    @Input({ title: '模型' })
    model: string = `deepseek-ai/DeepSeek-V3.2-Exp`;

    @Output({ title: '输出' })
    text: string = ``;

    type: `LlmTextAgentAst` = `LlmTextAgentAst`
}