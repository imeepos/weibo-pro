import { Injectable, root } from '@sker/core';
import { Handler, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { PromptRoleSkillAst } from '@sker/workflow-ast';
import { PromptRoleSkillRefEntity, PromptSkillEntity, useEntityManager, In, type SkillSummary } from '@sker/entities';
import { Observable } from 'rxjs';
import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { useLlmModel } from './llm-client';

const SkillSelectionSchema = z.object({
  selected_skill_ids: z.array(z.string()).describe('选中的技能ID列表'),
  reasoning: z.string().describe('选择这些技能的原因')
});

@Injectable()
export class PromptRoleSkillAstVisitor {

  @Handler(PromptRoleSkillAst)
  handler(ast: PromptRoleSkillAst, ctx: WorkflowGraphAst) {
    return new Observable((obs) => {
      const abortController = new AbortController();

      const run = async () => {
        if (abortController.signal.aborted) {
          ast.state = 'fail';
          setAstError(ast, new Error('工作流已取消'));
          obs.next({ ...ast });
          return;
        }

        if (!ast.roleId) {
          ast.state = 'fail';
          setAstError(ast, new Error('请指定角色ID'));
          obs.next({ ...ast });
          obs.complete();
          return;
        }

        ast.state = 'running';
        ast.count += 1;
        obs.next({ ...ast });

        await useEntityManager(async (manager) => {
          // 获取角色的可用技能
          const skillRefs = await manager.find(PromptRoleSkillRefEntity, {
            where: { role_id: ast.roleId },
            relations: ['skill'],
            order: { sort_order: 'ASC' }
          });

          const skills: SkillSummary[] = skillRefs.map(ref => ({
            id: ref.skill.id,
            title: ref.skill.title,
            type: ref.skill.type,
            description: ref.skill.description
          }));

          ast.availableSkills = skills;
          obs.next({ ...ast });

          if (skills.length === 0) {
            ast.state = 'success';
            ast.selectedSkillsList.next([]);
            ast.skillContent.next({});
            obs.next({ ...ast });
            obs.complete();
            return;
          }

          // 使用 LLM 和 function call 选择技能
          const model = useLlmModel({
            model: ast.model,
            temperature: ast.temperature
          });

          // 创建获取技能内容的工具
          const getSkillTool = new DynamicStructuredTool({
            name: 'get_skill_content',
            description: '获取指定技能的详细内容',
            schema: z.object({
              skill_id: z.string().describe('技能ID')
            }),
            func: async ({ skill_id }) => {
              if (ast.skillContents.has(skill_id)) {
                return ast.skillContents.get(skill_id);
              }
              const skill = await manager.findOne(PromptSkillEntity, {
                where: { id: skill_id }
              });
              if (!skill) return '技能不存在';
              ast.skillContents.set(skill_id, skill.content);
              return skill.content;
            }
          });

          const skillsDescription = skills
            .map(s => `- [${s.type}] ${s.title} (ID: ${s.id}): ${s.description || '无描述'}`)
            .join('\n');

          const systemPrompt = `你是一个智能助手，负责为当前角色选择合适的技能。
根据用户需求，从以下可用技能中选择最合适的技能：

${skillsDescription}

使用 get_skill_content 工具来查看技能的详细内容，然后决定是否需要该技能。
最后，选择最相关的技能供角色使用。`;

          const userPrompt = Array.isArray(ast.requirements)
            ? ast.requirements.filter(Boolean).join('\n')
            : ast.requirements;

          try {
            // 第一轮：LLM 使用工具选择技能
            const toolModel = model.bindTools([getSkillTool]);
            const response = await toolModel.invoke([
              { role: 'system', content: systemPrompt },
              { role: 'human', content: userPrompt }
            ]);

            // 处理工具调用
            let selectedIds = new Set<string>();
            if (response.tool_calls && response.tool_calls.length > 0) {
              for (const toolCall of response.tool_calls) {
                if (toolCall.name === 'get_skill_content') {
                  const skillId = toolCall.args.skill_id;
                  // 预加载技能内容
                  const skill = await manager.findOne(PromptSkillEntity, {
                    where: { id: skillId }
                  });
                  if (skill) {
                    ast.skillContents.set(skillId, skill.content);
                  }
                }
              }
            }

            // 第二轮：使用 structured output 获取最终选择
            const structuredModel = model.withStructuredOutput(SkillSelectionSchema);
            const selectionResult = await structuredModel.invoke([
              { role: 'system', content: systemPrompt },
              { role: 'human', content: userPrompt }
            ]);

            // 验证并获取选中的技能
            const validSkillIds = new Set(skills.map(s => s.id));
            const finalSelectedIds = (selectionResult.selected_skill_ids || [])
              .filter(id => validSkillIds.has(id));

            if (finalSelectedIds.length > 0) {
              const selectedSkills = skills.filter(s => finalSelectedIds.includes(s.id));
              ast.selectedSkills = selectedSkills;
              ast.selectedSkillsList.next(selectedSkills);

              // 预加载所有选中技能的内容
              const skillsData = await manager.find(PromptSkillEntity, {
                where: { id: In(finalSelectedIds) }
              });

              const contentMap: Record<string, string> = {};
              for (const skill of skillsData) {
                ast.skillContents.set(skill.id, skill.content);
                contentMap[skill.id] = skill.content;
              }

              ast.skillContent.next(contentMap);
            } else {
              ast.selectedSkillsList.next([]);
              ast.skillContent.next({});
            }

            obs.next({ ...ast });
          } catch (error) {
            throw new Error(`LLM 选择技能失败: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        });

        ast.state = 'success';
        obs.next({ ...ast });
        obs.complete();
      };

      run().catch(e => {
        ast.state = 'fail';
        setAstError(ast, e);
        obs.next({ ...ast });
        obs.complete();
      });

      return () => {
        abortController.abort();
        obs.complete();
      };
    });
  }
}
