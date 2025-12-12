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
import { ChatOpenAI } from '@langchain/openai';

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
          const model = new ChatOpenAI({
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

          // 创建新记忆
          const memory = manager.create(MemoryEntity, {
            persona_id: ast.personaId,
            name: `对话-${new Date().toLocaleString('zh-CN')}`,
            content: `问：${userPrompt}\n答：${responseText}`,
            type: 'event',
          });
          await manager.save(memory);

          // 创建关系
          const relatedIds = memories.slice(0, 3).map(m => m.id);
          for (const relatedId of relatedIds) {
            const relation = manager.create(MemoryRelationEntity, {
              source_id: relatedId,
              target_id: memory.id,
              relation_type: 'related',
            });
            await manager.save(relation);

            // 更新闭包表
            const ancestorClosures = await manager.find(MemoryClosureEntity, {
              where: { descendant_id: relatedId },
            });
            for (const ac of ancestorClosures) {
              const newClosure = manager.create(MemoryClosureEntity, {
                ancestor_id: ac.ancestor_id,
                descendant_id: memory.id,
                path: [...ac.path, memory.id],
                depth: ac.depth + 1,
              });
              await manager.save(newClosure);
            }
          }

          // 自引用闭包
          const selfClosure = manager.create(MemoryClosureEntity, {
            ancestor_id: memory.id,
            descendant_id: memory.id,
            path: [memory.id],
            depth: 0,
          });
          await manager.save(selfClosure);

          ast.newMemoryId.next(memory.id);
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
}
