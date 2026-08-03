import {
  useEntityManager,
  PersonaEntity,
  MemoryEntity,
  MemoryRelationEntity,
  MemoryEvidenceEntity,
} from '@sker/entities';
import type {
  PersonaMemoryGraph,
  MemoryNode,
  MemoryEdge,
} from '@sker/sdk';
import { In } from 'typeorm';
import {
  inferMemorySection,
  isLlmWikiSectionHubName,
  LLM_WIKI_SECTION_HUB_NAMES,
} from './investigation/llm-wiki-memory-organization';

/**
 * 构建人物的记忆图谱（节点、边、区块、统计信息）
 */
export async function getPersonaMemoryGraph(personaId: string): Promise<PersonaMemoryGraph> {
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

    const sectionByHubId = new Map<string, keyof typeof LLM_WIKI_SECTION_HUB_NAMES>();
    for (const memory of memories) {
      if (memory.type !== 'concept' || !isLlmWikiSectionHubName(memory.name)) {
        continue;
      }

      const section = (Object.entries(LLM_WIKI_SECTION_HUB_NAMES).find(
        ([, hubName]) => hubName === memory.name,
      )?.[0] ?? null) as keyof typeof LLM_WIKI_SECTION_HUB_NAMES | null;

      if (section) {
        sectionByHubId.set(memory.id, section);
      }
    }

    const sectionByMemoryId = new Map<string, keyof typeof LLM_WIKI_SECTION_HUB_NAMES>();
    for (const relation of relations) {
      if (relation.relation_type !== 'contains') {
        continue;
      }

      const section = sectionByHubId.get(relation.source_id);
      if (section) {
        sectionByMemoryId.set(relation.target_id, section);
      }
    }

    const memoryNodes: MemoryNode[] = memories.map((m) => {
      const hubSection = sectionByHubId.get(m.id);
      const section =
        hubSection ??
        sectionByMemoryId.get(m.id) ??
        inferMemorySection({
          type: m.type,
          name: m.name,
          content: m.content,
        });

      return {
        id: m.id,
        name: m.name,
        description: m.description,
        content: m.content,
        type: m.type,
        createdAt: m.created_at.toISOString(),
        section,
        isSectionHub: Boolean(hubSection),
        stability: 'stable',
      };
    });

    const memoryEdges: MemoryEdge[] = relations.map(r => ({
      id: r.id,
      sourceId: r.source_id,
      targetId: r.target_id,
      relationType: r.relation_type,
    }));
    const evidence = memoryIds.length > 0
      ? await manager.find(MemoryEvidenceEntity, {
          where: { memory_id: In(memoryIds) },
        } as any)
      : [];
    const personaMetadata = (persona as PersonaEntity & { metadata?: Record<string, unknown> }).metadata ?? {};

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
      tree: (personaMetadata.graphTree as any[]) ?? [],
      timeline: (personaMetadata.timeline as any[]) ?? [],
      coordinationSignals: (personaMetadata.coordinationSignals as any[]) ?? [],
      stats: {
        totalMemories: memoryNodes.length,
        totalEvents: ((personaMetadata.timeline as any[]) ?? []).length,
        totalEvidencePosts: new Set(evidence.map((item) => item.source_id)).size,
        totalWarnings: ((personaMetadata.warnings as string[]) ?? []).length,
      },
    };
  });
}
