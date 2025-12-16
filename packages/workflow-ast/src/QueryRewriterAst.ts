import { Ast, Input, Output, Node, IS_MULTI } from "@sker/workflow";

@Node({
  title: '查询重写器',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class QueryRewriterAst extends Ast {

  @Input({ title: '原始查询', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
  query: string[] = [];

  @Input({ title: '子查询数量', defaultValue: 3 })
  teamSize: number = 3;

  @Input({ title: '温度', defaultValue: 0.7 })
  temperature: number = 0.7;

  @Input({ title: '模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
  model: string = 'deepseek-ai/DeepSeek-V3.2';

  @Output({ title: '子查询列表', defaultValue: '' })
  subQueries: string | string[] = ``;

  @Output({ title: '推理过程', defaultValue: '' })
  reasoning = ``;

  type: 'QueryRewriterAst' = 'QueryRewriterAst';
}
