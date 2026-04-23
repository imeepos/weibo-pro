import { describe, expect, it, vi } from 'vitest';
import { EventSentimentDetailService } from './event-sentiment-detail.service';
import { mockEntityManager } from '../../../test-setup';

vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities');
  return {
    ...actual,
    useEntityManager: vi.fn((fn: any) => fn(mockEntityManager)),
  };
});

describe('EventSentimentDetailService', () => {
  it('builds emotion map, user emotion insights, and detailed trend payloads', async () => {
    const nlpQuery = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          keywords: [
            { keyword: '愤怒', weight: 0.9, sentiment: 'negative' },
            { keyword: '担忧', weight: 0.6, sentiment: 'negative' },
          ],
          sentiment: {
            positive_prob: 0.1,
            negative_prob: 0.7,
            neutral_prob: 0.2,
          },
          post: {
            user_id: 'user-1',
            user: { screen_name: '用户A' },
          },
        },
        {
          keywords: [
            { keyword: '愤怒', weight: 0.4, sentiment: 'negative' },
          ],
          sentiment: {
            positive_prob: 0.2,
            negative_prob: 0.6,
            neutral_prob: 0.2,
          },
          post: {
            user_id: 'user-1',
            user: { screen_name: '用户A' },
          },
        },
        {
          keywords: [
            { keyword: '支持', weight: 0.5, sentiment: 'positive' },
          ],
          sentiment: {
            positive_prob: 0.8,
            negative_prob: 0.1,
            neutral_prob: 0.1,
          },
          post: {
            user_id: 'user-2',
            user: { screen_name: '用户B' },
          },
        },
      ]),
    };

    const statsQuery = {
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        {
          year: 2026,
          month: 4,
          day: 20,
          hour: 8,
          sentiment_positive: 0.2,
          sentiment_negative: 0.6,
          sentiment_neutral: 0.2,
        },
        {
          year: 2026,
          month: 4,
          day: 20,
          hour: 9,
          sentiment_positive: 0.3,
          sentiment_negative: 0.5,
          sentiment_neutral: 0.2,
        },
      ]),
    };

    vi.spyOn(mockEntityManager, 'getRepository').mockImplementation((entity: any) => {
      if (entity.name === 'EventHourlyStatisticsEntity') {
        return { createQueryBuilder: vi.fn(() => statsQuery) } as any;
      }
      return { createQueryBuilder: vi.fn(() => nlpQuery) } as any;
    });

    const service = new EventSentimentDetailService();
    const emotionMap = await service.getEventEmotionMap('event-1');
    const insights = await service.getEventUserEmotionInsights('event-1');
    const trend = await service.getEventSentimentTrendDetailed('event-1');

    expect(emotionMap[0]).toMatchObject({ label: '愤怒', weight: 1.3 });
    expect(insights[0]).toMatchObject({
      userId: 'user-1',
      screenName: '用户A',
      postCount: 2,
      emotionTilt: 'negative',
    });
    expect(trend[0]).toMatchObject({
      timestamp: '2026-04-20T08:00:00.000Z',
      positive: 0.2,
      negative: 0.6,
      neutral: 0.2,
    });
  });
});
