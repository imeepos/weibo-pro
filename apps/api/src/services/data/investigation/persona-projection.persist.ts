import {
  MemoryEntity,
  MemoryClosureEntity,
  MemoryEvidenceEntity,
  MemoryRelationEntity,
  PersonaEntity,
  WeiboUserPersonaLinkEntity,
  useEntityManager,
} from '@sker/entities';
import { LLM_WIKI_SECTION_HUB_NAMES } from './llm-wiki-memory-organization';
import { buildProjection } from './persona-projection.build';
import type { ProjectionInput } from './persona-projection.build';

/**
 * 将投影结果持久化到 persona / memory / relation / closure / evidence 表。
 */
export async function publishProfile(input: ProjectionInput): Promise<void> {
  await useEntityManager(async (manager) => {
    const projection = await buildProjection(input);

    const linkRepo = manager.getRepository(WeiboUserPersonaLinkEntity);
    const personaRepo = manager.getRepository(PersonaEntity);
    const memoryRepo = manager.getRepository(MemoryEntity);
    const closureRepo = manager.getRepository(MemoryClosureEntity);
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
      await closureRepo.delete([
        ...existingMemories.map((item) => ({ ancestor_id: item.id })),
        ...existingMemories.map((item) => ({ descendant_id: item.id })),
      ] as any);
      await evidenceRepo.delete(existingMemories.map((item) => ({ memory_id: item.id })) as any);
      await memoryRepo.delete(existingMemories.map((item) => item.id));
    }

    const sectionHubIdBySection = new Map<string, string>();
    const usedSections = Array.from(
      new Set(
        projection.memories
          .map((draft) => draft.section)
          .filter((section): section is NonNullable<typeof section> => Boolean(section)),
      ),
    );

    for (const section of usedSections) {
      const savedHub = await memoryRepo.save(memoryRepo.create({
        persona_id: savedPersona.id,
        name: LLM_WIKI_SECTION_HUB_NAMES[section],
        description: `${section} section hub`,
        content: `${section} section hub`,
        type: 'concept',
      }));
      sectionHubIdBySection.set(section, savedHub.id);

      await closureRepo.save(closureRepo.create({
        ancestor_id: savedHub.id,
        descendant_id: savedHub.id,
        path: [savedHub.id],
        depth: 0,
      }));
    }

    const memoryIdByName = new Map<string, string>();
    for (const draft of projection.memories) {
      const savedMemory = await memoryRepo.save(memoryRepo.create({
        persona_id: savedPersona.id,
        name: draft.name,
        description: draft.description,
        content: draft.content,
        type: draft.type,
      }));
      memoryIdByName.set(draft.name, savedMemory.id);

      await closureRepo.save(closureRepo.create({
        ancestor_id: savedMemory.id,
        descendant_id: savedMemory.id,
        path: [savedMemory.id],
        depth: 0,
      }));

      const hubId = draft.section ? sectionHubIdBySection.get(draft.section) : undefined;
      if (hubId) {
        await relationRepo.save(relationRepo.create({
          source_id: hubId,
          target_id: savedMemory.id,
          relation_type: 'contains',
        }));
        await updateClosure(manager, hubId, savedMemory.id);
      }

      for (const evidence of draft.evidenceRefs) {
        await evidenceRepo.save(evidenceRepo.create({
          memory_id: savedMemory.id,
          source_table: evidence.sourceTable,
          source_id: evidence.sourceId,
          excerpt: evidence.excerpt ?? null,
          evidence_type: 'direct_quote',
          score: evidence.score,
        } as any));
      }
    }

    for (const draft of projection.memories) {
      const sourceId = memoryIdByName.get(draft.name);
      if (!sourceId) continue;

      for (const relation of draft.relationDrafts) {
        let targetId: string | undefined;

        if (relation.targetKind === 'memory') {
          targetId = memoryIdByName.get(relation.targetRef);
        } else if (relation.targetKind === 'persona') {
          targetId = memoryIdByName.get(relation.targetRef);
          if (!targetId) {
            const personMemory = await memoryRepo.save(memoryRepo.create({
              persona_id: savedPersona.id,
              name: relation.targetRef,
              description: '关联 Persona',
              content: `关联 Persona: ${relation.targetRef}`,
              type: 'person',
            }));

            memoryIdByName.set(relation.targetRef, personMemory.id);
            targetId = personMemory.id;

            await closureRepo.save(closureRepo.create({
              ancestor_id: personMemory.id,
              descendant_id: personMemory.id,
              path: [personMemory.id],
              depth: 0,
            }));
          }
        }

        if (!targetId || targetId === sourceId) continue;

        await relationRepo.save(relationRepo.create({
          source_id: sourceId,
          target_id: targetId,
          relation_type: relation.relationType,
        }));

        await updateClosure(manager, sourceId, targetId);
      }
    }
  });
}

async function updateClosure(
  manager: any,
  sourceId: string,
  targetId: string,
): Promise<void> {
  const closureRepo = manager.getRepository(MemoryClosureEntity);
  const ancestorClosures = await closureRepo.find({
    where: { descendant_id: sourceId },
  });

  for (const ancestor of ancestorClosures) {
    await closureRepo.save(closureRepo.create({
      ancestor_id: ancestor.ancestor_id,
      descendant_id: targetId,
      path: [...ancestor.path, targetId],
      depth: ancestor.depth + 1,
    }));
  }
}
