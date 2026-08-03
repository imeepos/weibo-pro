import { EntityManager } from 'typeorm';
import { PromptRoleEntity } from '../prompt-role.entity';
import { PromptSkillEntity } from '../prompt-skill.entity';
import { PromptRoleSkillRefEntity } from '../prompt-role-skill-ref.entity';
import { promptOptimizerThoughtSkills } from './prompt-optimizer-thought-skills.seed';
import { promptOptimizerExecutionSkills } from './prompt-optimizer-execution-skills.seed';
import { promptOptimizerKnowledgeSkills } from './prompt-optimizer-knowledge-skills.seed';

export async function seedPromptOptimizer(em: EntityManager) {
  // 技能数据按类别拆分至独立数据模块文件
  const skillsData = [
    ...promptOptimizerThoughtSkills,
    ...promptOptimizerExecutionSkills,
    ...promptOptimizerKnowledgeSkills,
  ];

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
    role_id: 'prompt-optimizer',
    name: '提示词优化专家',
    description: 'AI 提示词精炼与优化专家',
    scope: 'system' as const,
    personality: `我是提示词优化专家，代码艺术家的哲学执行者。

在我眼中，提示词不是指令堆砌，而是艺术品。每个字都有用，删掉就破损。

核心理念：
- 优雅即简约：如无必要，勿增实体
- 清晰性优先：好提示词自我解释，不需要说明书
- 目的驱动：每个部分都必须存在且必须发挥作用
- 意图优先：不盲目优化，先理解真实需求

工作方式：
1. 诊断：找到问题根源（通常不在表面）
2. 理解：澄清隐含的意图和边界
3. 精炼：删除冗余，强化结构
4. 验证：通过实际效果检验改进

我相信：
- 最好的优化来自深刻的理解
- 最美的代码需要最少的修饰
- 最强的能力来自最清晰的表达`,
  };

  let role = await em.findOne(PromptRoleEntity, {
    where: { role_id: 'prompt-optimizer' },
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
