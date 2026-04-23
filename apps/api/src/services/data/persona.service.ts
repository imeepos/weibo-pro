import { Inject, Injectable } from '@sker/core';
import {
  MemoryEvidenceEntity,
  useEntityManager,
  PersonaEntity,
  MemoryEntity,
  MemoryRelationEntity,
  MemoryClosureEntity,
  UserProfileDistillationTaskEntity,
  WeiboUserPersonaLinkEntity,
} from '@sker/entities';
import type {
  PersonaListItem,
  PersonaEvidenceItem,
  PersonaNetworkGraph,
  PersonaMemoryGraph,
  MemoryNode,
  MemoryEdge,
  RetrieveMemoriesRequest,
  RetrieveMemoriesResponse,
  RetrievedMemory,
  CreateMemoryRequest,
} from '@sker/sdk';
import { In } from 'typeorm';
import { PersonaProjectionService } from './investigation/persona-projection.service';
import { PersonaNetworkService } from './investigation/persona-network.service';

@Injectable({ providedIn: 'root' })
export class PersonaService {
  constructor(
    @Inject(PersonaProjectionService)
    private readonly personaProjectionService: PersonaProjectionService,
    @Inject(PersonaNetworkService)
    private readonly personaNetworkService: PersonaNetworkService,
  ) {}

  async getPersonaByWeiboUserId(weiboUserId: string): Promise<PersonaListItem | null> {
    return useEntityManager(async (manager) => {
      const link = await manager.findOne(WeiboUserPersonaLinkEntity, {
        where: {
          weibo_user_id: weiboUserId,
          status: 'active',
          is_primary: true,
        },
      });

      if (!link) return null;

      const persona = await manager.findOne(PersonaEntity, {
        where: { id: link.persona_id },
      });

      if (!persona) return null;

      const memoryCount = await manager
        .createQueryBuilder(MemoryEntity, 'm')
        .where('m.persona_id = :personaId', { personaId: persona.id })
        .getCount();

      return {
        id: persona.id,
        name: persona.name,
        avatar: persona.avatar,
        description: persona.description,
        memoryCount,
        createdAt: persona.created_at.toISOString(),
      };
    });
  }

  async getGraphOverview(): Promise<PersonaNetworkGraph> {
    return useEntityManager(async (manager) => {
      const links = await manager.find(WeiboUserPersonaLinkEntity, {
        where: { status: 'active' },
      });

      if (!links.length) {
        return this.personaNetworkService.getGraphOverview();
      }

      const personaIds = Array.from(new Set(links.map((item) => item.persona_id)));
      const personas = await manager.find(PersonaEntity, {
        where: { id: In(personaIds) },
      });

      const memoryCounts = await manager
        .createQueryBuilder(MemoryEntity, 'm')
        .select('m.persona_id', 'personaId')
        .addSelect('COUNT(*)', 'count')
        .where('m.persona_id IN (:...personaIds)', { personaIds })
        .groupBy('m.persona_id')
        .getRawMany();

      const latestTasks = await manager
        .createQueryBuilder(UserProfileDistillationTaskEntity, 't')
        .distinctOn(['t.weibo_user_id'])
        .select([
          't.weibo_user_id AS "weiboUserId"',
          't.created_at AS "createdAt"',
          't.distilled_json AS "distilledJson"',
        ])
        .where('t.weibo_user_id IN (:...weiboUserIds)', {
          weiboUserIds: Array.from(new Set(links.map((item) => item.weibo_user_id))),
        })
        .orderBy('t.weibo_user_id', 'ASC')
        .addOrderBy('t.created_at', 'DESC')
        .getRawMany();

      const countMap = new Map(memoryCounts.map((row: any) => [row.personaId, Number(row.count)]));
      const taskMap = new Map(latestTasks.map((row: any) => [String(row.weiboUserId), row]));

      return {
        personas: links.map((link) => {
          const persona = personas.find((item) => item.id === link.persona_id);
          const latestTask = taskMap.get(String(link.weibo_user_id));
          const distilledJson = latestTask?.distilledJson as Record<string, any> | undefined;

          return {
            personaId: link.persona_id,
            weiboUserId: String(link.weibo_user_id),
            name: persona?.name ?? String(link.weibo_user_id),
            avatar: persona?.avatar ?? null,
            riskLevel: distilledJson?.risk?.overallLevel ?? 'low',
            riskScore: Number(distilledJson?.risk?.overallScore ?? 0),
            traits: persona?.traits ?? [],
            memoryCount: countMap.get(link.persona_id) ?? 0,
            lastDistilledAt: latestTask?.createdAt ? new Date(latestTask.createdAt).toISOString() : null,
          };
        }),
        edges: [],
      };
    });
  }

  async getPersonaEvidence(personaId: string): Promise<PersonaEvidenceItem[]> {
    return useEntityManager(async (manager) => {
      const memories = await manager.find(MemoryEntity, {
        where: { persona_id: personaId },
      });

      if (!memories.length) {
        return this.personaProjectionService.getEvidenceForPersona(personaId);
      }

      const memoryIds = memories.map((memory) => memory.id);
      const evidence = await manager.find(MemoryEvidenceEntity, {
        where: { memory_id: In(memoryIds) },
      });

      return evidence.map((item) => ({
        id: item.id,
        memoryId: item.memory_id,
        sourceTable: item.source_table,
        sourceId: item.source_id,
        excerpt: item.excerpt,
        evidenceType: item.evidence_type,
        score: Number(item.score),
        metadata: item.metadata,
        createdAt: item.created_at.toISOString(),
      }));
    });
  }

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
