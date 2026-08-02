import { Ast, Input, IS_MULTI, Node, Output, State } from '@sker/workflow';

@Node({
  title: 'LLM 推理',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 2000,
  retryBackoff: 2
})
export class LlmInferenceAst extends Ast {
  @State({ title: '模型' })
  model = 'deepseek-ai/DeepSeek-V3.2';

  @State({ title: '温度' })
  temperature = 0.7;

  @Input({ title: '系统提示词', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
  system: string[] = [];

  @Input({ title: '用户提示词', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
  prompt: string[] = [];

  @Output({ title: '输出', defaultValue: '' })
  text = '';

  type = 'LlmInferenceAst';
}
