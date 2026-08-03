import type { PromptSkillType } from '@sker/entities';

export const SKILL_TYPES: { value: PromptSkillType; label: string }[] = [
  { value: 'thought', label: '思维' },
  { value: 'execution', label: '执行' },
  { value: 'knowledge', label: '知识' },
  { value: 'decision', label: '决策' },
];

export const SKILLS_PER_PAGE = 10;
