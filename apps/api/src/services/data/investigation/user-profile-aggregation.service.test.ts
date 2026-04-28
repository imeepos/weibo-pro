import { describe, expect, it } from 'vitest';
import { UserProfileAggregationService } from './user-profile-aggregation.service';

describe('UserProfileAggregationService', () => {
  it('builds event windows, same-content clusters, and coordination signals from post extractions', async () => {
    const service = new UserProfileAggregationService();
    const dossier = {
      historyCoverage: { windowDays: 90 },
      accountSnapshot: { weiboUserId: '100', screenName: '用户A' },
    } as any;

    const result = await service.aggregate({
      dossier,
      extractions: [
        {
          postId: '1',
          createdAt: '2026-04-28T01:00:00.000Z',
          normalizedText: '支持某事件的统一口径',
          extracted: {
            topicLabels: ['赛事'],
            eventLabel: '事件A',
            eventKey: 'event-a',
            viewpointLabels: ['支持'],
            stance: '支持',
            sentiment: 'positive',
            emotionLabels: ['激动'],
            entities: [],
            riskSignals: [],
            coordinationMarkers: ['same-template'],
            temporalHints: { postCreatedAt: '2026-04-28T01:00:00.000Z', inferredPhase: 'burst' },
            contentFingerprint: 'fp-1',
            excerpt: '支持某事件的统一口径',
          },
        },
        {
          postId: '2',
          createdAt: '2026-04-28T01:05:00.000Z',
          normalizedText: '支持某事件的统一口径',
          extracted: {
            topicLabels: ['赛事'],
            eventLabel: '事件A',
            eventKey: 'event-a',
            viewpointLabels: ['支持'],
            stance: '支持',
            sentiment: 'positive',
            emotionLabels: ['激动'],
            entities: [],
            riskSignals: [],
            coordinationMarkers: ['same-template'],
            temporalHints: { postCreatedAt: '2026-04-28T01:05:00.000Z', inferredPhase: 'burst' },
            contentFingerprint: 'fp-1',
            excerpt: '支持某事件的统一口径',
          },
        },
      ],
    });

    expect(result.timeline[0]?.postCount).toBe(2);
    expect(result.coordinationSignals[0]?.label).toContain('疑似协同传播');
    expect(result.tree.some((node) => node.kind === 'event_cluster')).toBe(true);
  });
});
