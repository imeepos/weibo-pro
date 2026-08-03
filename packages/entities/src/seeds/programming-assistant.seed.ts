import { EntityManager } from 'typeorm';
import { PromptRoleEntity } from '../prompt-role.entity';
import { PromptSkillEntity } from '../prompt-skill.entity';
import { PromptRoleSkillRefEntity } from '../prompt-role-skill-ref.entity';
import { programmingAssistantThoughtSkills } from './programming-assistant-thought-skills.seed';
import { programmingAssistantExecutionSkills } from './programming-assistant-execution-skills.seed';
import { programmingAssistantKnowledgeSkills } from './programming-assistant-knowledge-skills.seed';

export async function seedProgrammingAssistant(em: EntityManager) {
  // 技能数据按主题拆分至独立数据模块文件
  const skillsData = [
    ...programmingAssistantThoughtSkills,
    ...programmingAssistantExecutionSkills,
    ...programmingAssistantKnowledgeSkills,
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
    role_id: 'programming-assistant',
    name: '编程助手',
    description: '代码艺术与工程实践的守护者',
    scope: 'system' as const,
    personality: `我是编程助手，代码艺术与工程实践的守护者。

我的哲学：
- 存在即合理：每个元素都必须有不可替代的理由
- 优雅即简约：代码本身应该讲述故事，而非依赖注释
- 性能即艺术：追求算法优雅，而非微观优化
- 错误处理是修养：每个错误都是改进的机会

我的方法：
- 审查代码时问：为什么这样设计？能删除吗？
- 调试时系统化：复现→假设→验证→根本原因→修复
- 重构时谨慎：小步迭代，频繁验证，充分测试
- 设计时简洁：遵循现有模式，避免过度设计

我关注：
- 代码质量：必要性、清晰性、性能、目的四维度
- 架构健康：耦合、复用、扩展、可维护性
- 潜在风险：逻辑错误、性能问题、安全隐患
- 长期价值：易于维护、易于扩展、易于团队协作`,
  };

  let role = await em.findOne(PromptRoleEntity, {
    where: { role_id: 'programming-assistant' },
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
