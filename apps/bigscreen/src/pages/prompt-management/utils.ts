import type { PromptRoleWithSkills } from '@sker/sdk';
import type { PromptSkillEntity, PromptSkillType } from '@sker/entities';
import { SKILL_TYPES } from './constants';

/** 按页切分技能列表。 */
export function paginateSkills<T>(items: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}

/** 将技能类型映射为中文标签。 */
export function getSkillTypeLabel(type: PromptSkillType): string | undefined {
  return SKILL_TYPES.find((t) => t.value === type)?.label;
}

/** 按类型分组可用技能，并排除当前角色已绑定的技能。 */
export function groupAvailableSkills(
  skills: PromptSkillEntity[],
  roles: PromptRoleWithSkills[],
  selectedRole: string | null
): Record<PromptSkillType, PromptSkillEntity[]> {
  const currentRole = roles.find((r) => r.id === selectedRole);
  const boundSkillIds = new Set(currentRole?.skill_refs?.map((ref) => ref.skill_id) || []);
  const available = skills.filter((s) => !boundSkillIds.has(s.id));

  return SKILL_TYPES.reduce((acc, type) => {
    acc[type.value] = available.filter((s) => s.type === type.value);
    return acc;
  }, {} as Record<PromptSkillType, PromptSkillEntity[]>);
}
