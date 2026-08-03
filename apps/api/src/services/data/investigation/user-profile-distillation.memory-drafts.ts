import type { DistilledUserProfile } from '@sker/sdk';
import { distilledMemoryDraftSchema } from './user-profile-distillation.schema';
import type { ProfileNormalizationContext } from './user-profile-distillation.types';
import {
  inferMemorySection,
  isLlmWikiSection,
  normalizeLlmWikiStability,
} from './llm-wiki-memory-organization';
import { asRecord, firstNonEmptyString } from './user-profile-distillation.utils';

export function applyProfileDefaults(
  profile: DistilledUserProfile,
  context: ProfileNormalizationContext,
): DistilledUserProfile {
  return {
    ...profile,
    memoryDrafts: normalizeMemoryDrafts(profile.memoryDrafts),
    metadata: {
      ...profile.metadata,
      model: profile.metadata.model || context.requestedModel,
      promptVersion: context.promptVersion,
      generatedAt: profile.metadata.generatedAt || new Date().toISOString(),
    },
  };
}

export function normalizeMemoryDrafts(
  drafts: unknown[],
): DistilledUserProfile['memoryDrafts'] {
  return drafts.flatMap((draft) => {
    const record = asRecord(draft);
    if (!record) {
      return [];
    }

    const candidate = {
      ...record,
      section: normalizeSection(record.section, record),
      isSectionHub: Boolean(record.isSectionHub),
      stability: normalizeLlmWikiStability(record.stability),
    };

    const result = distilledMemoryDraftSchema.safeParse(candidate);
    return result.success ? [result.data] : [];
  }) as DistilledUserProfile['memoryDrafts'];
}

export function normalizeSection(
  section: unknown,
  draft: Record<string, unknown>,
): 'identity' | 'behavior' | 'content' | 'risk' | 'relations' {
  if (isLlmWikiSection(section)) {
    return section;
  }

  return inferMemorySection({
    type: firstNonEmptyString(draft.type, 'insight') ?? 'insight',
    name: firstNonEmptyString(draft.name, '') ?? '',
    content: firstNonEmptyString(draft.content, '') ?? '',
  });
}
