import { Injectable } from '@sker/core';
import { Handler, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { PersonaAst, RetrievedMemory } from '@sker/workflow-ast';
import {
  useEntityManager,
  PersonaEntity,
  MemoryEntity,
  MemoryRelationEntity,
  MemoryClosureEntity,
  In,
} from '@sker/entities';
import { Observable } from 'rxjs';
import { z } from 'zod';
import { useLlmModel } from './llm-client';

const MemoryExtractionSchema = z.object({
  memories: z.array(z.object({
    name: z.string().describe('简洁的标题（10字以内），能概括记忆核心'),
    description: z.string().describe('一句话描述（30字以内），说明这条记忆的意义'),
    content: z.string().describe('记忆的具体内容'),
    type: z.enum(['fact', 'concept', 'event', 'person', 'insight']).describe('记忆类型：fact=客观事实、event=发生的事件、person=人物信息、concept=概念观点、insight=洞察感悟'),
  })).describe('提取的记忆列表，如果没有值得记忆的内容则为空数组'),
});

type ExtractedMemory = z.infer<typeof MemoryExtractionSchema>['memories'][number];

@Injectable()
export class PersonaAstVisitor {

  @Handler(PersonaAst)
  handler(ast: PersonaAst, ctx: WorkflowGraphAst) {
    return new Observable((obs) => {
      const abortController = new AbortController();

      const run = async () => {
        if (abortController.signal.aborted) {
          ast.state = 'fail';
          setAstError(ast, new Error('工作流已取消'));
          obs.next({ ...ast });
          return;
        }

        if (!ast.personaId) {
          ast.state = 'fail';
          setAstError(ast, new Error('请选择角色'));
          obs.next({ ...ast });
          obs.complete();
          return;
        }

        ast.state = 'running';
        ast.count += 1;
        obs.next({ ...ast });

        await useEntityManager(async (manager) => {
          const persona = await manager.findOneOrFail(PersonaEntity, {
            where: { id: ast.personaId },
          });

          ast.personaName = persona.name;
          ast.personaAvatar = persona.avatar || undefined;
          obs.next({ ...ast });

          // 记忆检索
          const stimuli = Array.isArray(ast.stimuli) ? ast.stimuli : [ast.stimuli];
          const searchTerms = stimuli.filter(Boolean).join(' ').toLowerCase();
          const startTime = Date.now();
          const timeoutMs = ast.retrievalTimeout * 1000;

          // 根据刺激词搜索初始记忆
          const initialMemories = searchTerms
            ? await manager
                .createQueryBuilder(MemoryEntity, 'm')
                .where('m.persona_id = :personaId', { personaId: ast.personaId })
                .andWhere(
                  '(LOWER(m.name) LIKE :search OR LOWER(m.content) LIKE :search)',
                  { search: `%${searchTerms}%` }
                )
                .orderBy('m.created_at', 'DESC')
                .limit(5)
                .getMany()
            : [];

          const retrieved: Map<string, RetrievedMemory> = new Map();
          const toExplore: Array<{ id: string; currentDepth: number }> = [];

          for (const m of initialMemories) {
            retrieved.set(m.id, {
              id: m.id,
              name: m.name,
              content: m.content,
              type: m.type,
              depth: 0,
            });
            toExplore.push({ id: m.id, currentDepth: 0 });
          }

          // 层级检索
          while (toExplore.length > 0 && (Date.now() - startTime) < timeoutMs) {
            if (abortController.signal.aborted) break;

            const { id, currentDepth } = toExplore.shift()!;
            if (currentDepth >= ast.retrievalDepth) continue;

            const closures = await manager.find(MemoryClosureEntity, {
              where: [
                { ancestor_id: id, depth: 1 },
                { descendant_id: id, depth: 1 },
              ],
            });

            const relatedIds = closures
              .map(c => c.ancestor_id === id ? c.descendant_id : c.ancestor_id)
              .filter(rid => !retrieved.has(rid));

            if (relatedIds.length > 0) {
              const relatedMemories = await manager.find(MemoryEntity, {
                where: { id: In(relatedIds) },
              });

              for (const m of relatedMemories) {
                retrieved.set(m.id, {
                  id: m.id,
                  name: m.name,
                  content: m.content,
                  type: m.type,
                  depth: currentDepth + 1,
                });
                toExplore.push({ id: m.id, currentDepth: currentDepth + 1 });
              }
            }
          }

          const memories = Array.from(retrieved.values()).sort((a, b) => a.depth - b.depth);
          ast.retrievedMemories = memories;

          // 构建上下文
          const contextParts: string[] = [];
          contextParts.push(`【角色】${persona.name}`);
          if (persona.description) contextParts.push(`【简介】${persona.description}`);
          if (persona.background) contextParts.push(`【背景】${persona.background}`);
          if (persona.traits?.length) contextParts.push(`【性格】${persona.traits.join('、')}`);

          if (memories.length > 0) {
            contextParts.push(`\n【相关记忆】`);
            for (const m of memories) {
              contextParts.push(`- [${m.type}] ${m.name}: ${m.content}`);
            }
          }

          ast.context = contextParts.join('\n');
          obs.next({ ...ast });

          if (abortController.signal.aborted) {
            ast.state = 'fail';
            setAstError(ast, new Error('工作流已取消'));
            obs.next({ ...ast });
            return;
          }

          // LLM 生成回复
          const model = useLlmModel({
            model: ast.model,
            temperature: ast.temperature,
          });

          const systemPrompt = `你是${persona.name}。根据以下上下文信息，以第一人称回复用户的问题或刺激。
保持角色一致性，回复应该自然、符合角色性格。

${ast.context}`;

          const userPrompt = stimuli.filter(Boolean).join('\n');

          const result = await model.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'human', content: userPrompt },
          ]);

          const responseText = result.content as string;
          ast.response.next(responseText);
          obs.next({ ...ast });

          if (abortController.signal.aborted) {
            ast.state = 'fail';
            setAstError(ast, new Error('工作流已取消'));
            obs.next({ ...ast });
            return;
          }

          // 智能提取记忆
          const extractedMemories = await this.extractMemories(model, userPrompt, responseText);

          if (extractedMemories.length === 0) {
            ast.state = 'success';
            obs.next({ ...ast });
            obs.complete();
            return;
          }

          // 批量创建记忆
          const savedMemoryIds: string[] = [];
          for (const em of extractedMemories) {
            const memory = manager.create(MemoryEntity, {
              persona_id: ast.personaId,
              name: em.name,
              description: em.description,
              content: em.content,
              type: em.type,
            });
            await manager.save(memory);
            savedMemoryIds.push(memory.id);

            // 自引用闭包
            const selfClosure = manager.create(MemoryClosureEntity, {
              ancestor_id: memory.id,
              descendant_id: memory.id,
              path: [memory.id],
              depth: 0,
            });
            await manager.save(selfClosure);
          }

          // 关联到检索到的记忆
          const relatedIds = memories.slice(0, 3).map(m => m.id);
          for (const memoryId of savedMemoryIds) {
            for (const relatedId of relatedIds) {
              const relation = manager.create(MemoryRelationEntity, {
                source_id: relatedId,
                target_id: memoryId,
                relation_type: 'related',
              });
              await manager.save(relation);

              const ancestorClosures = await manager.find(MemoryClosureEntity, {
                where: { descendant_id: relatedId },
              });
              for (const ac of ancestorClosures) {
                const newClosure = manager.create(MemoryClosureEntity, {
                  ancestor_id: ac.ancestor_id,
                  descendant_id: memoryId,
                  path: [...ac.path, memoryId],
                  depth: ac.depth + 1,
                });
                await manager.save(newClosure);
              }
            }
          }

          ast.newMemoryId.next(savedMemoryIds[0] || '');
        });

        ast.state = 'success';
        obs.next({ ...ast });
        obs.complete();
      };

      run().catch(e => {
        ast.state = 'fail';
        ast.error = e;
        obs.next({ ...ast });
        obs.complete();
      });

      return () => {
        abortController.abort();
        obs.complete();
      };
    });
  }

  private async extractMemories(
    model: ReturnType<typeof useLlmModel>,
    question: string,
    answer: string
  ): Promise<ExtractedMemory[]> {
    const structuredModel = model.withStructuredOutput(MemoryExtractionSchema);

    const systemPrompt = `分析对话内容，提取值得记忆的信息。只提取有实际意义的内容，不要为了提取而提取。
如果对话没有值得记忆的内容，返回空数组。`;

    const result = await structuredModel.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'human', content: `问：${question}\n答：${answer}` },
    ]);

    return result.memories;
  }
}
