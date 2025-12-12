import { Ast, Input, Output, Node, IS_MULTI } from "@sker/workflow";
import { BehaviorSubject } from "rxjs";

@Node({
  title: '研究规划器',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class ResearchPlannerAst extends Ast {

  @Input({ title: '研究主题', type: 'textarea', mode: IS_MULTI })
  query: string[] = [];

  @Input({ title: '团队规模' })
  teamSize: number = 3;

  @Input({ title: '温度' })
  temperature: number = 0.7;

  @Input({ title: '模型' })
  model: string = 'deepseek-ai/DeepSeek-V3';

  @Input({ title: 'Soundbites', type: 'textarea', mode: IS_MULTI })
  soundbites: string[] = [];

  @Output({ title: '子问题列表' })
  subproblems: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);

  @Output({ title: '推理过程' })
  reasoning: BehaviorSubject<string> = new BehaviorSubject<string>('');

  type: 'ResearchPlannerAst' = 'ResearchPlannerAst';
}
