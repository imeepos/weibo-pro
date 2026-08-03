import {
  MemoryEvidenceEntity,
  useEntityManager,
  PersonaEntity,
  MemoryEntity,
  WeiboUserPersonaLinkEntity,
} from '@sker/entities';
import type {
  PersonaListItem,
  PersonaEvidenceItem,
} from '@sker/sdk';
import { In } from 'typeorm';
import type { PersonaProjectionService } from './investigation/persona-projection.service';

/**
 * 通过微博用户 ID 获取主要人物
 */
export async function getPersonaByWeiboUserId(weiboUserId: string): Promise<PersonaListItem | null> {
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

/**
 * 获取人物的证据列表（无本地记忆时回退到投影服务）
 */
export async function getPersonaEvidence(
  personaId: string,
  personaProjectionService: PersonaProjectionService,
): Promise<PersonaEvidenceItem[]> {
  return useEntityManager(async (manager) => {
    const memories = await manager.find(MemoryEntity, {
      where: { persona_id: personaId },
    });

    if (!memories.length) {
      return personaProjectionService.getEvidenceForPersona(personaId);
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

/**
 * 获取人物列表（含记忆数量）
 */
export async function getPersonaList(): Promise<PersonaListItem[]> {
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
