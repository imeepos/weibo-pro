import { describe, expect, it } from 'vitest';
import { buildEventUserRiskRecord } from './event-user-risk-scoring';

describe('buildEventUserRiskRecord', () => {
  it('marks highly regular, low-interaction night posting users as abnormal bots', () => {
    const result = buildEventUserRiskRecord({
      userId: 'user-1',
      screenName: '用户A',
      followers: 24,
      verified: false,
      location: '未知',
      posts: [
        {
          createdAt: '2026-04-23T01:00:00.000Z',
          text: '统一口径转发，请立即扩散',
          source: '微博 weibo.com',
          repostsCount: 0,
          commentsCount: 0,
          attitudesCount: 0,
        },
        {
          createdAt: '2026-04-23T01:10:00.000Z',
          text: '统一口径转发，请立即扩散',
          source: '微博 weibo.com',
          repostsCount: 0,
          commentsCount: 0,
          attitudesCount: 0,
        },
        {
          createdAt: '2026-04-23T01:20:00.000Z',
          text: '统一口径转发，请立即扩散',
          source: '微博 weibo.com',
          repostsCount: 0,
          commentsCount: 0,
          attitudesCount: 0,
        },
      ],
      sentiments: [
        { overall: 'negative', positiveProb: 0.05, negativeProb: 0.9, neutralProb: 0.05 },
        { overall: 'negative', positiveProb: 0.05, negativeProb: 0.9, neutralProb: 0.05 },
        { overall: 'negative', positiveProb: 0.05, negativeProb: 0.9, neutralProb: 0.05 },
      ],
    });

    expect(result.riskLevel).toBe('high');
    expect(result.accountType).toBe('bot');
    expect(result.isAbnormal).toBe(true);
    expect(result.abnormalSignals.map((signal) => signal.type)).toEqual(
      expect.arrayContaining(['night_activity', 'regular_interval', 'high_similarity']),
    );
  });
});
