import type { PromptResourceScope, PromptSkillType } from '@sker/entities';

export interface RoleForm {
  role_id: string;
  name: string;
  description: string;
  personality: string;
  scope: PromptResourceScope;
}

export interface SkillForm {
  name: string;
  title: string;
  description: string;
  type: PromptSkillType;
  content: string;
}

export interface BindForm {
  skill_id: string;
  ref_type: string;
}

export type DeleteTarget = { type: 'role' | 'skill'; id: string; name: string } | null;

export type DeleteType = NonNullable<DeleteTarget>['type'];

export const DELETE_TYPE_LABELS: Record<DeleteType, string> = {
  role: '角色',
  skill: '技能',
};
