import { Injectable, } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { PromptRoleSkillAst } from '@sker/workflow-ast';
import { PromptRoleSkillRefEntity, PromptSkillEntity, useEntityManager, In, type SkillSummary } from '@sker/entities';
import { Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { useLlmModel } from './llm-client';
import { parse } from '@sker/json-harmony';

const SkillSelectionSchema = z.object({
  selected_skill_ids: z.array(z.string()).describe('选中的技能ID列表'),
  reasoning: z.string().describe('选择这些技能的原因')
});

// UUID 格式验证正则
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class PromptRoleSkillAstVisitor {

  @Handler(PromptRoleSkillAst)
  handler(ast: PromptRoleSkillAst, input$: Observable<Record<string, unknown>>, _ctx: WorkflowGraphAst) {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });
      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          try {

            ast.emitCount += 1;
            obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })
            if (inputData) {
              Object.keys(inputData).forEach(key => {
                (ast as unknown as Record<string, unknown>)[key] = inputData[key];
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
                relations: {
skill: true
      },
                order: { sort_order: 'ASC' }
              });

              const skills: SkillSummary[] = skillRefs.map(ref => ({
                id: ref.skill.id,
                title: ref.skill.title,
                type: ref.skill.type,
                description: ref.skill.description
              }));

              ast.availableSkills = skills;

              if (skills.length === 0) {
                ast.selectedSkillsList = [];
                ast.skillContent = {};
                ast.skillContentText = '';
                obs.next({ type: 'node_emit', id: ast.id, data: { selectedSkillsList: [], skillContent: {}, skillContentText: '' } });
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
                  skill_id: z.string().uuid('技能ID必须是有效的UUID格式').describe('技能ID')
                }),
                func: async ({ skill_id }) => {
                  // UUID 格式验证
                  if (!UUID_REGEX.test(skill_id)) {
                    return `错误：技能ID格式无效 (${skill_id})，必须是有效的UUID格式`;
                  }

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

## 可用技能列表
${skillsDescription}

## 任务要求
1. 使用 get_skill_content 工具查看技能的详细内容
2. 根据用户需求，选择最相关的技能
3. **重要**：必须以 JSON 格式返回结果

## 输出格式（必须严格遵守）
\`\`\`json
{
  "selected_skill_ids": ["skill-1", "skill-2"],
  "reasoning": "选择这些技能的原因"
}
\`\`\`

## 约束条件
- 技能ID必须是完整的UUID格式（从上述列表中选择）
- 不要编造或修改技能ID
- reasoning 字段用中文说明选择理由`;

              const userPrompt = Array.isArray(ast.requirements)
                ? ast.requirements.filter(Boolean).join('\n')
                : ast.requirements;

              const toolModel = model.bindTools([getSkillTool]);
              const toolResponse = await toolModel.invoke([
                { role: 'system', content: systemPrompt },
                { role: 'human', content: userPrompt }
              ]);

              if (toolResponse.tool_calls && toolResponse.tool_calls.length > 0) {
                for (const toolCall of toolResponse.tool_calls) {
                  if (toolCall.name === 'get_skill_content') {
                    const skillId = toolCall.args.skill_id;

                    // UUID 格式验证
                    if (!UUID_REGEX.test(skillId)) {
                      console.warn(`LLM 返回了无效的技能ID: ${skillId}`);
                      continue;
                    }

                    const skill = await manager.findOne(PromptSkillEntity, {
                      where: { id: skillId }
                    });
                    if (skill) {
                      Reflect.set(ast.skillContents, skillId, skill.content)
                    }
                  }
                }
              }

              // 使用普通模型调用（不使用 withStructuredOutput）
              const llmResponse = await model.invoke([
                { role: 'system', content: systemPrompt },
                { role: 'human', content: userPrompt }
              ]);

              // 使用 json-harmony 容错解析 LLM 输出
              const llmOutput = llmResponse.content as string;
              const parseResult = parse(llmOutput);

              // 检查解析是否成功（data 不为 null/undefined）
              if (!parseResult.data) {
                throw new Error(`LLM 输出解析失败: ${llmOutput}`);
              }

              // 使用 zod schema 验证解析后的数据
              const validationResult = SkillSelectionSchema.safeParse(parseResult.data);
              if (!validationResult.success) {
                throw new Error(`LLM 输出不符合预期格式: ${JSON.stringify(parseResult.data)}。验证错误: ${validationResult.error.message}`);
              }

              const selectionResult = validationResult.data;

              const validSkillIds = new Set(skills.map(s => s.id));

              // 过滤出有效的技能ID：必须是有效的UUID并且在可用技能列表中
              const finalSelectedIds = (selectionResult.selected_skill_ids || [])
                .filter(id => {
                  if (!UUID_REGEX.test(id)) {
                    console.warn(`LLM 返回了无效的技能ID: ${id}，已过滤`);
                    return false;
                  }
                  if (!validSkillIds.has(id)) {
                    console.warn(`LLM 返回的技能ID ${id} 不在可用技能列表中，已过滤`);
                    return false;
                  }
                  return true;
                });

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

                // 将 skillContent 对象转换为字符串（按技能顺序拼接）
                const skillTexts = selectedSkills
                  .map(skill => contentMap[skill.id])
                  .filter(Boolean)
                  .join('\n\n');
                ast.skillContentText = skillTexts;
              } else {
                ast.selectedSkillsList = [];
                ast.skillContent = {};
                ast.skillContentText = '';
              }

              // 发射输出事件
              obs.next({ type: 'node_emit', id: ast.id, data: { selectedSkillsList: ast.selectedSkillsList, skillContent: ast.skillContent, skillContentText: ast.skillContentText } });
            });

            return { success: true };
          } catch (error) {
            ast.state = 'fail';
            setAstError(ast, new Error(`LLM 选择技能失败: ${error instanceof Error ? error.message : '未知错误'}`));
            throw error;
          }
        })
      ).subscribe({
        next: () => {
          // 异步操作成功完成
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, new Error(`执行失败: ${error instanceof Error ? error.message : '未知错误'}`));
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
          obs.complete();
        },
        complete: () => {
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id });
          obs.complete();
        }
      });

      return () => {
        subscription.unsubscribe();
        abortController.abort();
      };
    });
  }
}
