import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { PersonaCreatorAst } from '@sker/workflow-ast';
import { useEntityManager, PersonaEntity, MemoryEntity, MemoryClosureEntity } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { z } from 'zod';
import { useLlmModel } from './llm-client';

const PersonaSchema = z.object({
  name: z.string().describe('角色名称'),
  description: z.string().describe('角色简介，一句话概括'),
  background: z.string().describe('角色详细背景故事'),
  traits: z.array(z.string()).describe('性格特质列表，如：善良、勇敢、固执'),
  initialMemories: z.array(z.object({
    name: z.string().describe('记忆名称'),
    description: z.string().describe('记忆简述，一句话概括'),
    content: z.string().describe('记忆详细内容'),
    type: z.enum(['fact', 'concept', 'event', 'person', 'insight']).describe('记忆类型'),
  })).describe('初始记忆，用于构建角色的知识图谱'),
  metadata: z.object({
    inventory: z.array(z.object({
      id: z.string(),
      name: z.string(),
      quantity: z.number(),
      category: z.enum(['equipment', 'consumable', 'material', 'quest']).optional(),
    })).optional().describe('携带物品'),
    currency: z.record(z.string(), z.number()).optional().describe('货币，如 { "金币": 100 }'),
    equipment: z.record(z.string(), z.string().nullable()).optional().describe('装备栏，如 { "武器": "木剑" }'),
  }).optional().describe('角色可见属性'),
  destiny: z.object({
    archetype: z.string().optional().describe('角色原型，如：英雄、反派、导师'),
    directives: z.array(z.string()).optional().describe('行为指令'),
    flags: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])).optional().describe('命运标记'),
  }).optional().describe('角色不可见属性（命运配置）'),
});

@Injectable()
export class PersonaCreatorAstVisitor {

  @Handler(PersonaCreatorAst)
  handler(ast: PersonaCreatorAst, input$: Observable<Record<string, unknown>>, _ctx: WorkflowGraphAst) {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount +=1;
          obs.next({ type: 'node_emit', id: ast.id, data: { emitCount: ast.emitCount } })
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as unknown as Record<string, unknown>)[key] = inputData[key];
            });
          }

          if (abortController.signal.aborted) {
            throw new Error('工作流已取消');
          }

          const descriptions = Array.isArray(ast.descriptions) ? ast.descriptions : [ast.descriptions];
          const prompt = descriptions.filter(Boolean).join('\n');

          if (!prompt.trim()) {
            throw new Error('请提供角色描述');
          }

          const model = useLlmModel({
            model: ast.model,
            temperature: ast.temperature,
          });

          const structuredModel = model.withStructuredOutput(PersonaSchema);

          const systemPrompt = `你是一位专业的角色设计师。根据用户提供的描述，创建一个详细、立体的角色。

要求：
1. 名称应当独特且富有意义
2. 背景故事要丰富，包含成长经历、重要事件
3. 性格特质要多维度，既有优点也有缺点
4. 初始记忆应涵盖角色的关键知识、经历和人际关系
5. 如果描述中提到物品、装备、货币，请在 metadata 中体现
6. 根据角色定位设置合适的命运配置

请根据以下描述创建角色：`;

          const result = await structuredModel.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'human', content: prompt },
          ]);

          if (abortController.signal.aborted) {
            throw new Error('工作流已取消');
          }

          ast.generatedName = result.name;
          ast.generatedDescription = result.description;
          ast.generatedBackground = result.background;
          ast.generatedTraits = result.traits;
          ast.generatedMetadata = result.metadata || {};
          ast.generatedDestiny = result.destiny || {};

          await useEntityManager(async (manager) => {
            const persona = manager.create(PersonaEntity, {
              name: result.name,
              description: result.description,
              background: result.background,
              traits: result.traits,
              metadata: result.metadata || {},
              destiny: result.destiny || {},
            });
            await manager.save(persona);

            ast.personaId = persona.id;
            ast.personaName = persona.name;

            if (result.initialMemories?.length) {
              for (const mem of result.initialMemories) {
                const memory = manager.create(MemoryEntity, {
                  persona_id: persona.id,
                  name: mem.name,
                  description: mem.description,
                  content: mem.content,
                  type: mem.type,
                });
                await manager.save(memory);

                const selfClosure = manager.create(MemoryClosureEntity, {
                  ancestor_id: memory.id,
                  descendant_id: memory.id,
                  path: [memory.id],
                  depth: 0,
                });
                await manager.save(selfClosure);
              }
            }
          });

          return [
            { type: 'node_emit' as const, id: ast.id, data: { personaId: ast.personaId, personaName: ast.personaName } }
          ];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => {
          obs.next(event);
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error instanceof Error ? error : new Error(String(error)));
          obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message });
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
        obs.complete();
      };
    });
  }
}
