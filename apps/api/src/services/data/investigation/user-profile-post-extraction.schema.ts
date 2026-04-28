import { z } from 'zod';

export const postExtractionSchema = z.object({
  topicLabels: z.array(z.string()).default([]),
  eventLabel: z.string().nullable(),
  eventKey: z.string().nullable(),
  viewpointLabels: z.array(z.string()).default([]),
  stance: z.string().nullable(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  emotionLabels: z.array(z.string()).default([]),
  entities: z
    .array(
      z.object({
        type: z.string().min(1),
        value: z.string().min(1),
      }),
    )
    .default([]),
  riskSignals: z.array(z.string()).default([]),
  coordinationMarkers: z.array(z.string()).default([]),
  temporalHints: z.object({
    postCreatedAt: z.string().nullable(),
    inferredPhase: z.enum(['preheat', 'burst', 'aftermath', 'unknown']),
  }),
  contentFingerprint: z.string().min(1),
  excerpt: z.string().min(1),
});

export type PostExtraction = z.infer<typeof postExtractionSchema>;
