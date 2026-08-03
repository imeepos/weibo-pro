import {
  useEntityManager,
  PersonaEntity,
  MemoryEntity,
  MemoryClosureEntity,
} from '@sker/entities';
import type {
  RetrieveMemoriesRequest,
  RetrieveMemoriesResponse,
  RetrievedMemory,
} from '@sker/sdk';
import { In } from 'typeorm';

/**
 * 根据刺激词检索人物记忆（支持深度与超时限制）
 */
export async function retrievePersonaMemories(request: RetrieveMemoriesRequest): Promise<RetrieveMemoriesResponse> {
  const { personaId, stimuli, depth = 3, timeout = 10 } = request;
  const startTime = Date.now();
  const timeoutMs = timeout * 1000;

  return useEntityManager(async (manager) => {
    const persona = await manager.findOneOrFail(PersonaEntity, {
      where: { id: personaId },
    });

    // 根据刺激词搜索初始记忆
    const searchTerms = stimuli.join(' ').toLowerCase();
    const initialMemories = await manager
      .createQueryBuilder(MemoryEntity, 'm')
      .where('m.persona_id = :personaId', { personaId })
      .andWhere(
        '(LOWER(m.name) LIKE :search OR LOWER(m.content) LIKE :search)',
        { search: `%${searchTerms}%` }
      )
      .orderBy('m.created_at', 'DESC')
      .limit(5)
      .getMany();

    const retrieved: Map<string, RetrievedMemory> = new Map();
    const toExplore: Array<{ id: string; currentDepth: number }> = [];

    // 添加初始记忆
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
      const { id, currentDepth } = toExplore.shift()!;

      if (currentDepth >= depth) continue;

      // 查找关联记忆
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

    const memories = Array.from(retrieved.values())
      .sort((a, b) => a.depth - b.depth);

    // 构建上下文
    const context = buildMemoryContext(persona, memories);

    return { memories, context };
  });
}

/**
 * 构建人物检索上下文
 */
export function buildMemoryContext(persona: PersonaEntity, memories: RetrievedMemory[]): string {
  const parts: string[] = [];

  // 角色背景
  parts.push(`【角色】${persona.name}`);
  if (persona.description) {
    parts.push(`【简介】${persona.description}`);
  }
  if (persona.background) {
    parts.push(`【背景】${persona.background}`);
  }
  if (persona.traits?.length) {
    parts.push(`【性格】${persona.traits.join('、')}`);
  }

  // 记忆
  if (memories.length > 0) {
    parts.push(`\n【相关记忆】`);
    for (const m of memories) {
      parts.push(`- [${m.type}] ${m.name}: ${m.content}`);
    }
  }

  return parts.join('\n');
}
