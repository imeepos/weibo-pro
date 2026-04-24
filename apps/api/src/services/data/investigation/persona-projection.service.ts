import { Injectable } from '@sker/core';
import {
  MemoryEntity,
  MemoryEvidenceEntity,
  MemoryRelationEntity,
  PersonaEntity,
  WeiboUserPersonaLinkEntity,
  useEntityManager,
} from '@sker/entities';
import type {
  DistilledUserProfile,
  PersonaEvidenceItem,
} from '@sker/sdk';

@Injectable({ providedIn: 'root' })
export class PersonaProjectionService {
  async buildProjection(
    input: DistilledUserProfile & {
      weiboUserId: string;
      screenName: string;
      avatar: string | null;
    },
  ): Promise<{
    persona: {
      name: string;
      avatar: string | null;
      description: string;
      background: string;
      traits: string[];
      metadata: Record<string, unknown>;
    };
    memories: DistilledUserProfile['memoryDrafts'];
    evidence: Array<{
      sourceTable: string;
      sourceId: string;
      excerpt?: string;
      score: number;
    }>;
  }> {
    return {
      persona: {
        name: input.screenName,
        avatar: input.avatar,
        description: input.summary.short,
        background: input.summary.long,
        traits: input.identity.stableTraits,
        metadata: {
          source: {
            weiboUserId: input.weiboUserId,
            screenName: input.screenName,
          },
          profile: {
            role: input.identity.inferredRole,
            riskLevel: input.risk.overallLevel,
            riskScore: input.risk.overallScore,
            primaryTopics: input.content.primaryTopics,
          },
          metadata: input.metadata,
        },
      },
      memories: input.memoryDrafts,
      evidence: input.memoryDrafts.flatMap((draft) => draft.evidenceRefs),
    };
  }

  async getEvidenceForPersona(_personaId: string): Promise<PersonaEvidenceItem[]> {
    return [];
  }

  async publishProfile(input: DistilledUserProfile & {
    weiboUserId: string;
    screenName: string;
    avatar: string | null;
  }): Promise<void> {
    await useEntityManager(async (manager) => {
      const projection = await this.buildProjection(input);

      const linkRepo = manager.getRepository(WeiboUserPersonaLinkEntity);
      const personaRepo = manager.getRepository(PersonaEntity);
      const memoryRepo = manager.getRepository(MemoryEntity);
      const relationRepo = manager.getRepository(MemoryRelationEntity);
      const evidenceRepo = manager.getRepository(MemoryEvidenceEntity);

      const existingLink = await linkRepo.findOne({
        where: {
          weibo_user_id: input.weiboUserId,
          is_primary: true,
        },
      });

      const persona = existingLink
        ? await personaRepo.findOne({ where: { id: existingLink.persona_id } })
        : null;

      const savedPersona = await personaRepo.save(
        personaRepo.create({
          id: persona?.id,
          name: projection.persona.name,
          avatar: projection.persona.avatar,
          description: projection.persona.description,
          background: projection.persona.background,
          traits: projection.persona.traits,
          metadata: projection.persona.metadata,
          destiny: persona?.destiny ?? {},
        }),
      );

      await linkRepo.save(linkRepo.create({
        id: existingLink?.id,
        weibo_user_id: input.weiboUserId,
        persona_id: savedPersona.id,
        is_primary: true,
        status: 'active',
        confidence: input.summary.confidence,
      }));

      const existingMemories = await memoryRepo.find({
        where: { persona_id: savedPersona.id },
      });
      if (existingMemories.length > 0) {
        await relationRepo.delete([
          ...existingMemories.map((item) => ({ source_id: item.id })),
          ...existingMemories.map((item) => ({ target_id: item.id })),
        ] as any);
        await evidenceRepo.delete(existingMemories.map((item) => ({ memory_id: item.id })) as any);
        await memoryRepo.delete(existingMemories.map((item) => item.id));
      }

      for (const draft of projection.memories) {
        const savedMemory = await memoryRepo.save(memoryRepo.create({
          persona_id: savedPersona.id,
          name: draft.name,
          description: draft.description,
          content: draft.content,
          type: draft.type,
        }));

        for (const evidence of draft.evidenceRefs) {
          await evidenceRepo.save(evidenceRepo.create({
            memory_id: savedMemory.id,
            source_table: evidence.sourceTable,
            source_id: evidence.sourceId,
            excerpt: evidence.excerpt ?? null,
            evidence_type: 'direct_quote',
            score: evidence.score,
          }));
        }
      }
    });
  }
}
