import { Injectable } from '@sker/core';
import {
  useEntityManager,
  PersonaEntity,
  MemoryEntity,
  MemoryRelationEntity,
} from '@sker/entities';
import type { PersonaListItem, PersonaMemoryGraph, MemoryNode, MemoryEdge } from '@sker/sdk';

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
}
