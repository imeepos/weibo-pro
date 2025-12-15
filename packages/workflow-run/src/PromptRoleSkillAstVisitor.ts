import { Injectable, root } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { PromptRoleSkillAst } from '@sker/workflow-ast';
import { PromptRoleSkillRefEntity, PromptSkillEntity, useEntityManager, In, type SkillSummary } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
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
  handler(ast: PromptRoleSkillAst, input$: Observable<any>, ctx: WorkflowGraphAst) {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id, data: ast });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1;
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as any)[key] = inputData[key];
            });
          }

          if (abortController.signal.aborted) {
            throw new Error('工作流已取消');
          }

          if (!ast.roleId) {
            throw new Error('请指定角色ID');
          }

          await useEntityManager(async (manager) => {
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
              obs.next({ type: 'node_runing', id: ast.id, data: ast });

              if (skills.length === 0) {
                ast.state = 'success';
                ast.selectedSkillsList = [];
                ast.skillContent = {};
                obs.next({ type: 'node_success', id: ast.id, data: ast });
                obs.complete();
                return;
              }

              const model = useLlmModel({
                model: ast.model,
                temperature: ast.temperature
              });

              const getSkillTool = new DynamicStructuredTool({
                name: 'get_skill_content',
                description: '获取指定技能的详细内容',
                schema: z.object({
                  skill_id: z.string().describe('技能ID')
                }),
                func: async ({ skill_id }) => {
                  if (ast.skillContents && ast.skillContents[`${skill_id}`]) {
                    return Reflect.get(ast.skillContents, skill_id)
                  }
                  const skill = await manager.findOne(PromptSkillEntity, {
                    where: { id: skill_id }
                  });
                  if (!skill) return '技能不存在';
                  Reflect.set(ast.skillContents, skill_id, skill.content)
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

              const toolModel = model.bindTools([getSkillTool]);
              const response = await toolModel.invoke([
                { role: 'system', content: systemPrompt },
                { role: 'human', content: userPrompt }
              ]);

              if (response.tool_calls && response.tool_calls.length > 0) {
                for (const toolCall of response.tool_calls) {
                  if (toolCall.name === 'get_skill_content') {
                    const skillId = toolCall.args.skill_id;
                    const skill = await manager.findOne(PromptSkillEntity, {
                      where: { id: skillId }
                    });
                    if (skill) {
                      Reflect.set(ast.skillContents, skillId, skill.content)
                    }
                  }
                }
              }

              const structuredModel = model.withStructuredOutput(SkillSelectionSchema);
              const selectionResult = await structuredModel.invoke([
                { role: 'system', content: systemPrompt },
                { role: 'human', content: userPrompt }
              ]);

              const validSkillIds = new Set(skills.map(s => s.id));
              const finalSelectedIds = (selectionResult.selected_skill_ids || [])
                .filter(id => validSkillIds.has(id));

              if (finalSelectedIds.length > 0) {
                const selectedSkills = skills.filter(s => finalSelectedIds.includes(s.id));
                ast.selectedSkills = selectedSkills;
                ast.selectedSkillsList = selectedSkills;

                const skillsData = await manager.find(PromptSkillEntity, {
                  where: { id: In(finalSelectedIds) }
                });

                const contentMap: Record<string, string> = {};
                for (const skill of skillsData) {
                  Reflect.set(ast.skillContents, skill.id, skill.content)
                  contentMap[skill.id] = skill.content;
                }

                ast.skillContent = contentMap;
              } else {
                ast.selectedSkillsList = [];
                ast.skillContent = {};
              }
            });

          return [];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => {
          obs.next(event);
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, new Error(`LLM 选择技能失败: ${error instanceof Error ? error.message : '未知错误'}`));
          obs.next({ type: 'node_fail', id: ast.id, data: ast });
          obs.complete();
        },
        complete: () => {
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id, data: ast });
          obs.complete();
        }
      });

      return () => {
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }
}
