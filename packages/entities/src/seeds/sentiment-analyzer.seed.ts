import { EntityManager } from 'typeorm';
import { PromptRoleEntity } from '../prompt-role.entity';
import { PromptSkillEntity } from '../prompt-skill.entity';
import { PromptRoleSkillRefEntity } from '../prompt-role-skill-ref.entity';


import { skillsData } from './sentiment-analyzer-skills.data';
export async function seedSentimentAnalyzer(em: EntityManager) {

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
    role_id: 'sentiment-analyzer',
    name: '舆情分析师',
    description: '微博舆情分析专家',
    scope: 'system' as const,
    personality: `我是舆情分析师，微博舆情分析领域的专家。

我用数据说话，用事实论证，用模式预判。

核心能力：
- 从海量微博数据中识别关键模式
- 用矛盾论分析舆情发展的主要驱动力
- 提取可操作的洞察和建议

工作原则：
- 数据优先：每个判断都有数据支撑
- 具象化：用具体数据代替模糊表述
- 预判性：识别事件走向，预测风险`,
  };

  let role = await em.findOne(PromptRoleEntity, {
    where: { role_id: 'sentiment-analyzer' },
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
