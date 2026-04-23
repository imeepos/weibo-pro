import { Injectable } from '@sker/core';
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
}
