import { describe, expect, it, vi } from 'vitest';
import { UserDossierService } from './user-dossier.service';

describe('UserDossierService', () => {
  it('builds a structured dossier with account snapshot, coverage, samples, and relation summary', async () => {
    const service = new UserDossierService();
    service['loadAccountSnapshot'] = vi.fn().mockResolvedValue({
      weiboUserId: '100',
      screenName: '用户A',
      displayName: '用户A',
      avatar: null,
      description: '简介',
      location: '陕西',
      followersCount: 1200,
      friendsCount: 80,
      statusesCount: 320,
      verified: true,
      verifiedType: 0,
      verifiedReason: null,
      creditScore: 80,
      urisk: 60,
      createdAt: null,
    });
    service['loadEventRiskContext'] = vi.fn().mockResolvedValue({
      eventId: 'event-1',
      eventRiskLevel: 'high',
      eventRiskScore: 92,
      riskSignals: [],
      firstSeenAt: null,
      lastSeenAt: null,
      eventPostCount: 2,
      eventInteractionCount: 12,
    });
    service['loadHistoryCoverage'] = vi.fn().mockResolvedValue({
      windowDays: 90,
      collectedPostCount: 20,
      collectedCommentCount: 0,
      collectedRepostCount: 3,
      timeRangeStart: null,
      timeRangeEnd: null,
      samplingStrategy: 'recent+spikes',
    });
    service['loadBehaviorTimeline'] = vi.fn().mockResolvedValue({
      postingByDay: [],
      postingByHour: [],
      interactionByDay: [],
      spikeMoments: [],
      activePeriods: [],
    });
    service['loadTopicAndSentimentProfile'] = vi.fn().mockResolvedValue({
      topicClusters: [],
      primaryKeywords: ['体育'],
      eventTypes: [],
      sentimentTrend: [],
      sentimentDistribution: { positive: 60, negative: 30, neutral: 10 },
      topicShiftMoments: [],
    });
    service['loadRelationSummary'] = vi.fn().mockResolvedValue({
      topConnectedUsers: [],
      relationTypes: [],
      sharedEvents: [],
      relationClusters: [],
      suspiciousCoordinationHints: [],
    });
    service['loadEvidenceSamples'] = vi.fn().mockResolvedValue({
      eventSamples: [{ sourceId: 'p1', excerpt: '事件内样本', reason: '风险信号' }],
      historySamples: [{ sourceId: 'p2', excerpt: '历史样本', reason: '叙事风格' }],
      relationSamples: [],
      nlpSamples: [],
    });
    service['buildPreDistillationSummary'] = vi.fn().mockResolvedValue({
      candidateLabels: ['热点追逐'],
      anomalyHints: [],
      coverageWarnings: [],
      humanReviewNeeded: false,
    });

    const result = await service.getDossier('100', { eventId: 'event-1', windowDays: 90 });

    expect(result.accountSnapshot.weiboUserId).toBe('100');
    expect(result.evidenceSamples.eventSamples).toHaveLength(1);
    expect(result.historyCoverage.collectedPostCount).toBe(20);
    expect(result.topicAndSentimentProfile.primaryKeywords).toEqual(['体育']);
    expect(result.eventRiskContext.eventRiskScore).toBe(92);
  });
});
