import { Ast, Input, IS_MULTI, Node, Output } from "@sker/workflow";

@Node({ title: '结构化输出', type: 'llm' })
export class LlmStructuredOutputAst extends Ast {

    @Input({ title: '系统提示词', type: 'textarea', mode: IS_MULTI })
    system: string[] = [];

    @Input({ title: '用户提示词', type: 'textarea', mode: IS_MULTI })
    prompt: string[] = [];

    @Input({ title: 'JSON Schema', type: 'textarea' })
    schema: string = `{
  "type": "object",
  "properties": {
    "title": { "type": "string", "description": "标题" },
    "summary": { "type": "string", "description": "摘要" },
    "tags": { "type": "array", "items": { "type": "string" }, "description": "标签列表" }
  },
  "required": ["title", "summary"]
}`;

    @Input({ title: '温度' })
    temperature: number = 0;

    @Input({ title: '模型' })
    model: string = `deepseek-ai/DeepSeek-V3.2-Exp`;

    @Output({ title: 'JSON 输出' })
    output: Record<string, unknown> = {};

    @Output({ title: '原始文本' })
    rawText: string = ``;

    type: `LlmStructuredOutputAst` = `LlmStructuredOutputAst`
}
