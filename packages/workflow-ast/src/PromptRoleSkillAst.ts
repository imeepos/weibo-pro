import { Ast, Input, Output, State, Node, IS_MULTI } from "@sker/workflow";
import { BehaviorSubject } from "rxjs";
import type { SkillSummary } from "@sker/entities";

@Node({
  title: '角色技能',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class PromptRoleSkillAst extends Ast {

  @State({ title: '角色ID' })
  roleId?: string;

  @Input({ title: '角色需求', mode: IS_MULTI })
  requirements: string[] = [];

  @Input({ title: '温度' })
  temperature: number = 0.7;

  @Input({ title: '模型' })
  model: string = 'deepseek-ai/DeepSeek-V3';

  @State({ title: '可用技能列表' })
  availableSkills: SkillSummary[] = [];

  @State({ title: '选中的技能' })
  selectedSkills: SkillSummary[] = [];

  @State({ title: '技能内容缓存' })
  skillContents: Record<string, string> = {};

  @Output({ title: '选中技能列表' })
  selectedSkillsList: BehaviorSubject<SkillSummary[]> = new BehaviorSubject<SkillSummary[]>([]);

  @Output({ title: '技能内容' })
  skillContent: BehaviorSubject<Record<string, string>> = new BehaviorSubject<Record<string, string>>({});

  type: 'PromptRoleSkillAst' = 'PromptRoleSkillAst';
}
