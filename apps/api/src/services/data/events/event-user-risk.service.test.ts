import { describe, expect, it, vi } from 'vitest';
import { EventUserRiskService } from './event-user-risk.service';
import { mockEntityManager } from '../../../test-setup';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('EventUserRiskService', () => {
  it('builds event risk profile and abnormal user list from event NLP rows', async () => {
    const query = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          sentiment: { overall: 'negative', positive_prob: 0.05, negative_prob: 0.9, neutral_prob: 0.05 },
          post: {
            id: 'post-1',
            user_id: 'user-1',
            region_name: '北京',
            created_at: '2026-04-23T01:00:00.000Z',
            text_raw: '统一口径转发，请立即扩散',
            source: '微博 weibo.com',
            reposts_count: 0,
            comments_count: 0,
            attitudes_count: 0,
            user: { screen_name: '用户A', followers_count: 24, verified: false },
          },
        },
        {
          sentiment: { overall: 'negative', positive_prob: 0.05, negative_prob: 0.9, neutral_prob: 0.05 },
          post: {
            id: 'post-2',
            user_id: 'user-1',
            region_name: '北京',
            created_at: '2026-04-23T01:10:00.000Z',
            text_raw: '统一口径转发，请立即扩散',
            source: '微博 weibo.com',
            reposts_count: 0,
            comments_count: 0,
            attitudes_count: 0,
            user: { screen_name: '用户A', followers_count: 24, verified: false },
          },
        },
        {
          sentiment: { overall: 'negative', positive_prob: 0.05, negative_prob: 0.9, neutral_prob: 0.05 },
          post: {
            id: 'post-3',
            user_id: 'user-1',
            region_name: '北京',
            created_at: '2026-04-23T01:20:00.000Z',
            text_raw: '统一口径转发，请立即扩散',
            source: '微博 weibo.com',
            reposts_count: 0,
            comments_count: 0,
            attitudes_count: 0,
            user: { screen_name: '用户A', followers_count: 24, verified: false },
          },
        },
        {
          sentiment: { overall: 'neutral', positive_prob: 0.2, negative_prob: 0.2, neutral_prob: 0.6 },
          post: {
            id: 'post-4',
            user_id: 'user-2',
            region_name: '上海',
            created_at: '2026-04-23T09:00:00.000Z',
            text_raw: '正常讨论内容',
            source: 'iPhone',
            reposts_count: 3,
            comments_count: 2,
            attitudes_count: 10,
            user: { screen_name: '普通用户', followers_count: 1200, verified: true },
          },
        },
      ]),
    };

    vi.spyOn(mockEntityManager, 'getRepository').mockReturnValue({
      createQueryBuilder: vi.fn(() => query),
    } as any);

    const service = new EventUserRiskService();
    const profile = await service.getEventRiskProfile('event-1');
    const abnormalUsers = await service.getEventAbnormalUsers('event-1');

    expect(profile).toMatchObject({
      totalUsers: 2,
      abnormalUserCount: 1,
      riskDistribution: {
        high: 1,
      },
    });
    expect(profile.topSignals).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'night_activity' })]),
    );
    expect(abnormalUsers[0]).toMatchObject({
      userId: 'user-1',
      screenName: '用户A',
      accountType: 'bot',
    });
  });
});
