import { Ast, Input, Output, Node, IS_MULTI } from "@sker/workflow";

@Node({
  title: '研究规划器',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class ResearchPlannerAst extends Ast {

  @Input({ title: '研究主题', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
  query: string[] = [];

  @Input({ title: '团队规模', defaultValue: 3 })
  teamSize: number = 3;

  @Input({ title: '温度', defaultValue: 0.7 })
  temperature: number = 0.7;

  @Input({ title: '模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
  model: string = 'deepseek-ai/DeepSeek-V3.2';

  @Input({ title: 'Soundbites', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
  soundbites: string[] = [];

  @Output({ title: '子问题列表', defaultValue: [] })
  subproblems: string[] = [];

  @Output({ title: '推理过程', defaultValue: '' })
  reasoning = ``;

  type = 'ResearchPlannerAst';
}
