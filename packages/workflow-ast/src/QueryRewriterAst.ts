import { Ast, Input, Output, Node, IS_MULTI } from "@sker/workflow";
import { BehaviorSubject } from "rxjs";

@Node({
  title: '查询重写器',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class QueryRewriterAst extends Ast {

  @Input({ title: '原始查询', type: 'textarea', mode: IS_MULTI })
  query: string[] = [];

  @Input({ title: '子查询数量' })
  teamSize: number = 3;

  @Input({ title: '温度' })
  temperature: number = 0.7;

  @Input({ title: '模型' })
  model: string = 'deepseek-ai/DeepSeek-V3';

  @Output({ title: '子查询列表' })
  subQueries: BehaviorSubject<string[] | null> = new BehaviorSubject<string[] | null>(null);

  @Output({ title: '推理过程' })
  reasoning: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  type: 'QueryRewriterAst' = 'QueryRewriterAst';
}
