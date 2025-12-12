import { Injectable } from '@sker/core';
import {
  useEntityManager,
  PersonaEntity,
  MemoryEntity,
  MemoryRelationEntity,
  MemoryClosureEntity,
} from '@sker/entities';
import type {
  PersonaListItem,
  PersonaMemoryGraph,
  MemoryNode,
  MemoryEdge,
  RetrieveMemoriesRequest,
  RetrieveMemoriesResponse,
  RetrievedMemory,
  CreateMemoryRequest,
} from '@sker/sdk';
import { In } from 'typeorm';

@Injectable({ providedIn: 'root' })
export class PersonaService {

  async getPersonaList(): Promise<PersonaListItem[]> {
    return useEntityManager(async (manager) => {
      const personas = await manager.find(PersonaEntity, {
        order: { created_at: 'DESC' },
      });

      const memoryCounts = await manager
        .createQueryBuilder(MemoryEntity, 'm')
        .select('m.persona_id', 'personaId')
        .addSelect('COUNT(*)', 'count')
        .groupBy('m.persona_id')
        .getRawMany();

      const countMap = new Map(memoryCounts.map(r => [r.personaId, parseInt(r.count)]));

      return personas.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        description: p.description,
        memoryCount: countMap.get(p.id) ?? 0,
        createdAt: p.created_at.toISOString(),
      }));
    });
  }

  async getMemoryGraph(personaId: string): Promise<PersonaMemoryGraph> {
    return useEntityManager(async (manager) => {
      const persona = await manager.findOneOrFail(PersonaEntity, {
        where: { id: personaId },
      });

      const memories = await manager.find(MemoryEntity, {
        where: { persona_id: personaId },
        order: { created_at: 'ASC' },
      });

      const memoryIds = memories.map(m => m.id);

      const relations = memoryIds.length > 0
        ? await manager
            .createQueryBuilder(MemoryRelationEntity, 'r')
            .where('r.source_id IN (:...ids)', { ids: memoryIds })
            .orWhere('r.target_id IN (:...ids)', { ids: memoryIds })
            .getMany()
        : [];

      const memoryNodes: MemoryNode[] = memories.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        content: m.content,
        type: m.type,
        createdAt: m.created_at.toISOString(),
      }));

      const memoryEdges: MemoryEdge[] = relations.map(r => ({
        id: r.id,
        sourceId: r.source_id,
        targetId: r.target_id,
        relationType: r.relation_type,
      }));

      return {
        persona: {
          id: persona.id,
          name: persona.name,
          avatar: persona.avatar,
          description: persona.description,
          traits: persona.traits,
        },
        memories: memoryNodes,
        relations: memoryEdges,
      };
    });
  }

  async retrieveMemories(request: RetrieveMemoriesRequest): Promise<RetrieveMemoriesResponse> {
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
      const context = this.buildContext(persona, memories);

      return { memories, context };
    });
  }

  async createMemory(personaId: string, request: Omit<CreateMemoryRequest, 'personaId'>): Promise<MemoryNode> {
    const { name, content, type, relatedMemoryIds = [] } = request;

    return useEntityManager(async (manager) => {
      // 创建记忆
      const memory = manager.create(MemoryEntity, {
        persona_id: personaId,
        name,
        content,
        type,
      });
      await manager.save(memory);

      // 创建关系
      for (const relatedId of relatedMemoryIds) {
        const relation = manager.create(MemoryRelationEntity, {
          source_id: relatedId,
          target_id: memory.id,
          relation_type: 'related',
        });
        await manager.save(relation);

        // 更新闭包表
        await this.updateClosure(manager, relatedId, memory.id);
      }

      // 自引用闭包
      const selfClosure = manager.create(MemoryClosureEntity, {
        ancestor_id: memory.id,
        descendant_id: memory.id,
        path: [memory.id],
        depth: 0,
      });
      await manager.save(selfClosure);

      return {
        id: memory.id,
        name: memory.name,
        description: memory.description,
        content: memory.content,
        type: memory.type,
        createdAt: memory.created_at.toISOString(),
      };
    });
  }

  private buildContext(persona: PersonaEntity, memories: RetrievedMemory[]): string {
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

  private async updateClosure(manager: any, sourceId: string, targetId: string): Promise<void> {
    // 获取源节点的所有祖先
    const ancestorClosures = await manager.find(MemoryClosureEntity, {
      where: { descendant_id: sourceId },
    });

    // 为每个祖先创建到新节点的闭包
    for (const ac of ancestorClosures) {
      const newClosure = manager.create(MemoryClosureEntity, {
        ancestor_id: ac.ancestor_id,
        descendant_id: targetId,
        path: [...ac.path, targetId],
        depth: ac.depth + 1,
      });
      await manager.save(newClosure);
    }
  }
}
