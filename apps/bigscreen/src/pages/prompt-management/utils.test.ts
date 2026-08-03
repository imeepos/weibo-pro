import { describe, expect, it } from 'vitest';
import type { PromptRoleWithSkills } from '@sker/sdk';
import type { PromptSkillEntity } from '@sker/entities';
import { getSkillTypeLabel, groupAvailableSkills, paginateSkills } from './utils';

const skill = (id: string, type: PromptSkillEntity['type'] = 'thought'): PromptSkillEntity =>
  ({
    id,
    name: `skill-${id}`,
    title: `技能${id}`,
    description: null,
    type,
    content: '',
    scope: 'user',
  }) as PromptSkillEntity;

describe('paginateSkills', () => {
  it('输入为空时返回空数组', () => {
    expect(paginateSkills([], 1, 10)).toEqual([]);
  });

  it('按页切分数据', () => {
    const items = Array.from({ length: 25 }, (_, i) => skill(`s${i}`));
    expect(paginateSkills(items, 1, 10)).toHaveLength(10);
    expect(paginateSkills(items, 1, 10)[0].id).toBe('s0');
    expect(paginateSkills(items, 3, 10)).toHaveLength(5);
    expect(paginateSkills(items, 3, 10)[0].id).toBe('s20');
  });

  it('越界页返回空数组', () => {
    const items = Array.from({ length: 5 }, (_, i) => skill(`s${i}`));
    expect(paginateSkills(items, 2, 10)).toEqual([]);
  });
});

describe('getSkillTypeLabel', () => {
  it('映射技能类型到中文标签', () => {
    expect(getSkillTypeLabel('thought')).toBe('思维');
    expect(getSkillTypeLabel('execution')).toBe('执行');
    expect(getSkillTypeLabel('knowledge')).toBe('知识');
    expect(getSkillTypeLabel('decision')).toBe('决策');
  });
});

describe('groupAvailableSkills', () => {
  const skills = [
    skill('s1', 'thought'),
    skill('s2', 'execution'),
    skill('s3', 'knowledge'),
    skill('s4', 'decision'),
    skill('s5', 'thought'),
  ];

  it('未选择角色时返回全部技能并按类型分组', () => {
    const grouped = groupAvailableSkills(skills, [], null);
    expect(grouped.thought).toHaveLength(2);
    expect(grouped.execution).toHaveLength(1);
    expect(grouped.knowledge).toHaveLength(1);
    expect(grouped.decision).toHaveLength(1);
  });

  it('排除已绑定技能', () => {
    const role = {
      id: 'r1',
      skill_refs: [{ id: 'ref1', skill_id: 's1', skill_type: 'thought', ref_type: 'required' }],
    } as unknown as PromptRoleWithSkills;
    const grouped = groupAvailableSkills(skills, [role], 'r1');
    expect(grouped.thought.map((s) => s.id)).toEqual(['s5']);
  });

  it('保证返回所有类型键', () => {
    const grouped = groupAvailableSkills([], [], null);
    expect(Object.keys(grouped).sort()).toEqual(['decision', 'execution', 'knowledge', 'thought']);
    expect(grouped.thought).toEqual([]);
  });
});
