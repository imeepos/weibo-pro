import { describe, expect, it, vi } from 'vitest';
import { EventMilestoneService } from './event-milestone.service';
import { mockEntityManager } from '../../../test-setup';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('EventMilestoneService', () => {
  it('creates milestone cards from spikes and sentiment shifts', async () => {
    const statsQuery = {
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([
        {
          year: 2026,
          month: 4,
          day: 20,
          hour: 8,
          hotness: 20,
          post_count: 10,
          user_count: 8,
          sentiment_positive: 0.2,
          sentiment_negative: 0.2,
        },
        {
          year: 2026,
          month: 4,
          day: 20,
          hour: 9,
          hotness: 120,
          post_count: 60,
          user_count: 40,
          sentiment_positive: 0.1,
          sentiment_negative: 0.6,
        },
      ]),
    };

    const postsQuery = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          id: 'post-1',
          text_raw: '事件在 9 点出现热度峰值',
          comments_count: 30,
          reposts_count: 50,
          attitudes_count: 40,
          user: {
            screen_name: '官媒账号',
          },
        },
      ]),
    };

    vi.spyOn(mockEntityManager, 'getRepository').mockImplementation((entity: any) => {
      if (entity.name === 'EventHourlyStatisticsEntity') {
        return { createQueryBuilder: vi.fn(() => statsQuery) } as any;
      }
      return { createQueryBuilder: vi.fn(() => postsQuery) } as any;
    });

    const service = new EventMilestoneService();
    const milestones = await service.getEventMilestones('event-1');

    expect(milestones.length).toBeGreaterThan(0);
    expect(milestones[0]).toMatchObject({
      type: 'heat_spike',
      title: expect.stringContaining('热度'),
      representativePosts: [
        expect.objectContaining({
          postId: 'post-1',
          author: '官媒账号',
        }),
      ],
    });
  });
});
