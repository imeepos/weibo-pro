import type { DistilledUserProfile } from '@sker/sdk';
import type { ProfileNormalizationContext } from './user-profile-distillation.types';
import { validateProfile } from './user-profile-distillation.response';
import { buildCoercedMemoryDrafts, buildEvidencePool } from './user-profile-distillation.coercion';
import { deriveDominantSentiment } from './user-profile-distillation.normalizers';
import { compactStrings, shorten } from './user-profile-distillation.utils';

export function buildInvocationFallbackProfile(
  context: ProfileNormalizationContext,
  error: unknown,
): DistilledUserProfile {
  const { dossier } = context;
  const displayName =
    dossier.accountSnapshot.screenName ??
    dossier.accountSnapshot.displayName ??
    dossier.accountSnapshot.weiboUserId;
  const evidencePool = buildEvidencePool(context);
  const riskReasons = compactStrings([
    ...dossier.eventRiskContext.riskSignals.map((signal) => signal.label),
    ...dossier.preDistillationSummary.anomalyHints,
    ...dossier.preDistillationSummary.coverageWarnings,
  ]);
  const primaryTopics = dossier.topicAndSentimentProfile.primaryKeywords.slice(0, 5);
  const fallbackLongSummary = [
    `${displayName} 的用户画像由 dossier 保底生成。`,
    `窗口内累计样本帖子 ${dossier.historyCoverage.collectedPostCount} 条。`,
    `模型调用异常：${shorten(error instanceof Error ? error.message : String(error), 80)}。`,
    '本次结果仅供人工复核，不自动发布。',
  ].join(' ');
  const memoryDrafts = buildCoercedMemoryDrafts(
    {
      summary: fallbackLongSummary,
      memoryDrafts: {
        keyObservations: compactStrings([
          riskReasons[0],
          primaryTopics[0],
          dossier.behaviorTimeline.activePeriods[0],
        ]).join('；'),
        recentMilestones: riskReasons.slice(1, 3),
      },
    },
    evidencePool,
  );

  return validateProfile({
    summary: {
      short: shorten(`${displayName} 的自动蒸馏降级画像，需人工复核`, 36),
      long: fallbackLongSummary,
      confidence: 0.35,
    },
    identity: {
      inferredRole:
        dossier.accountSnapshot.verifiedReason ??
        (dossier.accountSnapshot.verified ? '认证账号' : '待人工复核账号'),
      roleConfidence: 0.35,
      accountNature: compactStrings([
        dossier.accountSnapshot.verified ? 'verified' : null,
        dossier.accountSnapshot.followersCount >= 100000 ? 'influencer' : null,
        dossier.accountSnapshot.location,
      ]),
      stableTraits: compactStrings([
        ...dossier.preDistillationSummary.candidateLabels.slice(0, 2),
        dossier.behaviorTimeline.activePeriods[0],
      ]),
    },
    behavior: {
      activityPattern:
        dossier.behaviorTimeline.activePeriods.length > 0
          ? dossier.behaviorTimeline.activePeriods
          : ['待人工复核'],
      postingRhythm:
        dossier.behaviorTimeline.spikeMoments.length > 0
          ? 'bursty'
          : dossier.historyCoverage.collectedPostCount >= 100
            ? 'active'
            : 'steady',
      escalationPattern:
        riskReasons.length > 0 ? riskReasons.slice(0, 3) : ['待人工复核'],
      historicalStability:
        dossier.preDistillationSummary.coverageWarnings.length > 0 ? 'tentative' : 'stable',
    },
    content: {
      primaryTopics,
      narrativeStyles:
        dossier.preDistillationSummary.candidateLabels.length > 0
          ? dossier.preDistillationSummary.candidateLabels.slice(0, 3)
          : ['待人工复核'],
      emotionalTendency: [deriveDominantSentiment(dossier)],
      stancePattern:
        riskReasons.length > 0 ? riskReasons.slice(0, 3) : ['待人工复核'],
    },
    risk: {
      overallLevel: dossier.eventRiskContext.eventRiskLevel,
      overallScore: dossier.eventRiskContext.eventRiskScore,
      riskDrivers:
        riskReasons.length > 0
          ? riskReasons.slice(0, 3).map((reason) => ({
              label: shorten(reason, 16),
              reason,
              confidence: 0.55,
            }))
          : [{ label: '待人工复核', reason: '模型调用失败，已降级为 dossier 保底画像', confidence: 0.45 }],
      reviewRecommendation: 'human_review',
    },
    relations: {
      keyConnections: dossier.relationSummary.topConnectedUsers.slice(0, 5).map((connection) => ({
        targetUserId: connection.userId,
        relationType: connection.relationTypes[0] ?? 'interaction',
        strength: Math.max(0, connection.weight),
        note:
          dossier.relationSummary.suspiciousCoordinationHints[0] ??
          connection.relationTypes[0] ??
          '待人工复核',
      })),
      clusterRole: dossier.relationSummary.relationClusters[0]?.label ?? null,
      coordinationSignals: dossier.relationSummary.suspiciousCoordinationHints,
    },
    memoryDrafts,
    metadata: {
      sampledPosts: dossier.historyCoverage.collectedPostCount,
      sampledComments: dossier.historyCoverage.collectedCommentCount,
      sampledReposts: dossier.historyCoverage.collectedRepostCount,
      windowDays: dossier.historyCoverage.windowDays,
      model: context.requestedModel,
      promptVersion: `${context.promptVersion}-fallback`,
      generatedAt: new Date().toISOString(),
    },
  });
}
