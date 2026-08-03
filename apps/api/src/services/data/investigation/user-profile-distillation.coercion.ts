import type { DistilledUserProfile } from '@sker/sdk';
import { distilledUserProfileSchema } from './user-profile-distillation.schema';
import type { EvidencePoolItem, ProfileNormalizationContext } from './user-profile-distillation.types';
import { applyProfileDefaults } from './user-profile-distillation.memory-drafts';
import {
  normalizeCount,
  normalizeReviewRecommendation,
  normalizeRiskLevel,
  normalizeRiskScore,
  normalizeWindowDays,
} from './user-profile-distillation.normalizers';
import {
  asRecord,
  clampConfidence,
  firstNonEmptyString,
  firstNumber,
  shorten,
} from './user-profile-distillation.utils';
import {
  buildCoercedBehavior,
  buildCoercedContent,
  buildCoercedIdentity,
  buildCoercedMemoryDrafts,
  buildCoercedRelations,
  buildRiskDrivers,
} from './user-profile-distillation.coercion-builders';

export { buildCoercedMemoryDrafts } from './user-profile-distillation.coercion-builders';

export function buildEvidencePool(context: ProfileNormalizationContext): EvidencePoolItem[] {
  const samples = [
    ...context.dossier.evidenceSamples.historySamples.map((sample) => ({
      sourceTable: 'weibo_posts',
      sourceId: sample.sourceId,
      excerpt: sample.excerpt,
      score: 0.8,
    })),
    ...context.dossier.evidenceSamples.eventSamples.map((sample) => ({
      sourceTable: 'weibo_posts',
      sourceId: sample.sourceId,
      excerpt: sample.excerpt,
      score: 0.78,
    })),
    ...context.dossier.evidenceSamples.nlpSamples.map((sample) => ({
      sourceTable: 'weibo_posts',
      sourceId: sample.sourceId,
      excerpt: sample.excerpt,
      score: 0.72,
    })),
    ...context.dossier.evidenceSamples.relationSamples.map((sample) => ({
      sourceTable: 'user_relation_statistics',
      sourceId: sample.sourceId,
      excerpt: sample.excerpt,
      score: 0.65,
    })),
  ];

  return samples.slice(0, 5);
}

export function looksLikeAlternativeProfilePayload(
  payload: unknown,
): payload is Record<string, unknown> {
  const record = asRecord(payload);
  if (!record) {
    return false;
  }

  const identity = asRecord(record.identity);
  const behavior = asRecord(record.behavior);
  const risk = asRecord(record.risk);
  const metadata = asRecord(record.metadata);

  return Boolean(
    typeof record.summary === 'string' ||
      identity?.handle ||
      identity?.verifiedInfo ||
      behavior?.postingFrequency ||
      behavior?.activeHours ||
      risk?.level ||
      risk?.reasons ||
      metadata?.sampleSize ||
      metadata?.dataWindow,
  );
}

export function tryCoerceProfilePayload(
  payload: unknown,
  context: ProfileNormalizationContext,
): DistilledUserProfile | null {
  if (!looksLikeAlternativeProfilePayload(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const risk = asRecord(record.risk);
  const metadata = asRecord(record.metadata);
  const summaryRecord = asRecord(record.summary);
  const summaryText = firstNonEmptyString(
    summaryRecord?.long,
    summaryRecord?.short,
    summaryRecord?.verdict,
    summaryRecord?.primaryThreat,
    record.summary,
  );
  const evidencePool = buildEvidencePool(context);

  const coercedProfile = {
    summary: {
      short: shorten(summaryText || '画像生成结果需要人工复核'),
      long: summaryText || '画像生成结果需要人工复核',
      confidence: clampConfidence(
        firstNumber(asRecord(record.summary)?.confidence, risk?.confidence) ?? 0.6,
      ),
    },
    identity: buildCoercedIdentity(record),
    behavior: buildCoercedBehavior(record),
    content: buildCoercedContent(record),
    risk: {
      overallLevel: normalizeRiskLevel(risk?.overallLevel ?? risk?.level, risk?.score),
      overallScore: normalizeRiskScore(risk?.overallScore ?? risk?.score),
      riskDrivers: buildRiskDrivers(risk),
      reviewRecommendation: normalizeReviewRecommendation(
        risk?.reviewRecommendation,
        risk?.score,
      ),
    },
    relations: buildCoercedRelations(record),
    memoryDrafts: buildCoercedMemoryDrafts(record, evidencePool),
    metadata: {
      sampledPosts: normalizeCount(
        metadata?.sampledPosts ?? metadata?.sampleSize,
        context.dossier.historyCoverage.collectedPostCount,
      ),
      sampledComments: normalizeCount(
        metadata?.sampledComments,
        context.dossier.historyCoverage.collectedCommentCount,
      ),
      sampledReposts: normalizeCount(
        metadata?.sampledReposts,
        context.dossier.historyCoverage.collectedRepostCount,
      ),
      windowDays: normalizeWindowDays(
        metadata?.windowDays ?? metadata?.dataWindow,
        context.dossier.historyCoverage.windowDays,
      ),
      model: firstNonEmptyString(metadata?.model, context.requestedModel) ?? context.requestedModel,
      promptVersion:
        firstNonEmptyString(metadata?.promptVersion, metadata?.modelVersion, context.promptVersion) ??
        context.promptVersion,
      generatedAt:
        firstNonEmptyString(metadata?.generatedAt, metadata?.analysisTime, metadata?.analyzedAt) ??
        new Date().toISOString(),
    },
  };

  const result = distilledUserProfileSchema.safeParse(coercedProfile);
  return result.success ? applyProfileDefaults(result.data as DistilledUserProfile, context) : null;
}
