import type { DistilledUserProfile } from '@sker/sdk';
import {
  inferMemorySection,
  LLM_WIKI_SECTIONS,
  normalizeLlmWikiStability,
} from './llm-wiki-memory-organization';

export type ProjectionInput = DistilledUserProfile & {
  weiboUserId: string;
  screenName: string;
  avatar: string | null;
};

export interface PersonaProjection {
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
}

/**
 * 把蒸馏后的用户画像投影为 persona + 记忆 + 证据三层结构。
 * 纯计算逻辑，不涉及数据库写入。
 */
export function buildProjection(input: ProjectionInput): PersonaProjection {
  const rawMetadata = input.metadata as Record<string, unknown>;
  const memories = input.memoryDrafts
    .filter((draft) => !draft.isSectionHub)
    .map((draft) => ({
      ...draft,
      section:
        draft.section ??
        inferMemorySection({
          type: draft.type,
          name: draft.name,
          content: draft.content,
        }),
      isSectionHub: false,
      stability: normalizeLlmWikiStability(draft.stability),
    }));

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
        aggregation: {
          extractorVersion: input.metadata.extractorVersion ?? null,
          aggregationVersion: input.metadata.aggregationVersion ?? null,
          eventWindowCount: input.metadata.eventWindowCount ?? 0,
          coordinationSignalCount: input.metadata.coordinationSignalCount ?? 0,
        },
        organizationMethod: 'llm_wiki_v1',
        sectionOrder: [...LLM_WIKI_SECTIONS],
        graphTree: Array.isArray(rawMetadata.graphTree) ? rawMetadata.graphTree : [],
        timeline: Array.isArray(rawMetadata.timeline) ? rawMetadata.timeline : [],
        coordinationSignals: Array.isArray(rawMetadata.coordinationSignals)
          ? rawMetadata.coordinationSignals
          : [],
        warnings: Array.isArray(input.metadata.warnings) ? input.metadata.warnings : [],
        metadata: input.metadata,
      },
    },
    memories,
    evidence: memories.flatMap((draft) => draft.evidenceRefs),
  };
}
