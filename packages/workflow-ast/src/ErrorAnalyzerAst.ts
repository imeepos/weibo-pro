import { Ast, Input, Node, Output, State, IS_MULTI } from "@sker/workflow";

@Node({
  title: '错误分析器',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 2,
  retryDelay: 1000,
  retryBackoff: 1.5
})
export class ErrorAnalyzerAst extends Ast {

  @Input({ title: '步骤日志', type: 'textarea', mode: IS_MULTI })
  steps: string[] = [];

  @State({ title: '温度' })
  temperature: number = 0.3;

  @State({ title: '模型' })
  model: string = 'deepseek-ai/DeepSeek-V3';

  @Output({ title: '总结' })
  recap = ``;

  @Output({ title: '错误定位' })
  blame = ``;

  @Output({ title: '改进建议' })
  improvement = ``;

  type: 'ErrorAnalyzerAst' = 'ErrorAnalyzerAst';
}
