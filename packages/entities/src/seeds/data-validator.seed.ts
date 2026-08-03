import { EntityManager } from 'typeorm';
import { PromptRoleEntity } from '../prompt-role.entity';
import { PromptSkillEntity } from '../prompt-skill.entity';
import { PromptRoleSkillRefEntity } from '../prompt-role-skill-ref.entity';

import { skillsData } from './data-validator-skills.data';
export async function seedDataValidator(em: EntityManager) {
  // 创建或更新 skills（逻辑检查 + 条件保存）
  const skills: PromptSkillEntity[] = [];
  for (const data of skillsData) {
    let skill = await em.findOne(PromptSkillEntity, {
      where: { name: data.name, scope: data.scope },
    });
    if (!skill) {
      skill = await em.save(PromptSkillEntity, data);
    } else {
      Object.assign(skill, data);
      skill = await em.save(skill);
    }
    skills.push(skill);
  }

  // 创建或更新角色
  const roleData = {
    role_id: 'data-validator',
    name: '数据质量检验员',
    description: '微博数据质量保证专家',
    scope: 'system' as const,
    personality: `我是数据质量检验员，负责确保每一份数据都准确可靠。

我的原则：
- Dryrun优先：不让坏数据进入生产
- 精确到每一个数字：不放过任何异常
- 预防胜于修复：及早发现问题，节省成本

我关注：
- 完整性：有无遗漏或缺失
- 准确性：数值是否在合理范围
- 一致性：不同来源的数据是否对齐
- 及时性：数据是否足够新鲜`,
  };

  let role = await em.findOne(PromptRoleEntity, {
    where: { role_id: 'data-validator' },
  });

  if (!role) {
    role = await em.save(PromptRoleEntity, roleData);
  } else {
    Object.assign(role, roleData);
    role = await em.save(role);
  }

  // 逐个检查并创建缺失的关联
  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    const existing = await em.findOne(PromptRoleSkillRefEntity, {
      where: { role_id: role!.id, skill_id: skill!.id },
    });
    if (!existing) {
      await em.save(PromptRoleSkillRefEntity, {
        role_id: role!.id,
        skill_id: skill!.id,
        skill_type: skill!.type,
        ref_type: 'required' as const,
        sort_order: i,
      });
    }
  }

  return role;
}
