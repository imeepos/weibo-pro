import { z } from 'zod';

export const distilledMemoryDraftSchema = z.object({
  type: z.enum(['fact', 'concept', 'event', 'person', 'insight']),
  name: z.string().min(1),
  description: z.string().nullable(),
  content: z.string().min(1),
  evidenceRefs: z.array(z.object({
    sourceTable: z.string().min(1),
    sourceId: z.string().min(1),
    excerpt: z.string().optional(),
    score: z.number().min(0).max(1),
  })).min(1),
  relationDrafts: z.array(z.object({
    relationType: z.enum(['related', 'causes', 'follows', 'contains']),
    targetKind: z.enum(['memory', 'persona']),
    targetRef: z.string().min(1),
    note: z.string().optional(),
  })),
  section: z.enum(['identity', 'behavior', 'content', 'risk', 'relations']).optional(),
  isSectionHub: z.boolean().optional(),
  stability: z.enum(['stable', 'tentative', 'conflicted']).optional(),
});

export const distilledUserProfileSchema = z.object({
  summary: z.object({
    short: z.string().min(1),
    long: z.string().min(1),
    confidence: z.number().min(0).max(1),
  }),
  identity: z.object({
    inferredRole: z.string().min(1),
    roleConfidence: z.number().min(0).max(1),
    accountNature: z.array(z.string()),
    stableTraits: z.array(z.string()),
  }),
  behavior: z.object({
    activityPattern: z.array(z.string()),
    postingRhythm: z.string().min(1),
    escalationPattern: z.array(z.string()),
    historicalStability: z.string().min(1),
  }),
  content: z.object({
    primaryTopics: z.array(z.string()),
    narrativeStyles: z.array(z.string()),
    emotionalTendency: z.array(z.string()),
    stancePattern: z.array(z.string()),
  }),
  risk: z.object({
    overallLevel: z.enum(['low', 'medium', 'high', 'critical']),
    overallScore: z.number().min(0).max(100),
    riskDrivers: z.array(z.object({
      label: z.string().min(1),
      reason: z.string().min(1),
      confidence: z.number().min(0).max(1),
    })),
    reviewRecommendation: z.enum(['auto_pass', 'human_review']),
  }),
  relations: z.object({
    keyConnections: z.array(z.object({
      targetUserId: z.string().min(1),
      relationType: z.string().min(1),
      strength: z.number().min(0),
      note: z.string().min(1),
    })),
    clusterRole: z.string().nullable(),
    coordinationSignals: z.array(z.string()),
  }),
  memoryDrafts: z.array(distilledMemoryDraftSchema).min(1),
  metadata: z.object({
    sampledPosts: z.number().int().min(0),
    sampledComments: z.number().int().min(0),
    sampledReposts: z.number().int().min(0),
    windowDays: z.number().int().min(1),
    model: z.string().min(1),
    promptVersion: z.string().min(1),
    generatedAt: z.string().min(1),
  }),
});

export type DistilledUserProfileInput = z.infer<typeof distilledUserProfileSchema>;
