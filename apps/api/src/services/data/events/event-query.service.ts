import { Injectable, Inject } from '@sker/core';
import {
  useEntityManager,
  EventStatisticsEntity,
  WeiboPostEntity,
  PostNLPResultEntity,
  findHotEvents,
  findEventList,
  findLatestEventStatistics,
  getEventCategoryStats,
  getDateRangeByTimeRange,
} from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../cache.service';
import type {
  TimeRange,
  HotEvent,
  EventListItem,
  EventWithCategory,
  EventStatistics,
  SentimentScore,
  EventCategoryStats,
  InfluenceUser,
  GeographicDistribution,
} from './types';
import { TREND_THRESHOLD, INFLUENCE_WEIGHTS } from './constants';
import { DataMockService } from './data-mock.service';

@Injectable({ providedIn: 'root' })
export class EventQueryService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService,
    @Inject(DataMockService) private readonly mockService: DataMockService
  ) {}

  async getEventList(
    timeRange: TimeRange,
    params?: { category?: string; search?: string; limit?: number }
  ): Promise<EventListItem[]> {
    const cacheKey = CacheService.buildKey(
      CACHE_KEYS.EVENT_DETAIL,
      'list',
      timeRange,
      params?.category || '',
      params?.search || ''
    );

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const events = await findEventList(timeRange, params);
        const eventIds = events.map((e) => e.id);

        const allStatistics = await this.getStatisticsBatch(eventIds, timeRange);
        const statsMap = new Map(allStatistics.map((s) => [s.event_id, s]));

        return events.map((event) => {
          const stats = statsMap.get(event.id);
          return this.mapEventToListItem(
            event,
            stats ? [stats] : []
          );
        });
      },
      CACHE_TTL.SHORT
    );
  }

  async getHotEvents(timeRange: TimeRange): Promise<HotEvent[]> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.HOT_EVENTS, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await findHotEvents(timeRange);
      },
      CACHE_TTL.SHORT
    );
  }

  async getEventById(id: string): Promise<EventWithCategory | null> {
    return await useEntityManager(async (entityManager) => {
      const event = await entityManager
        .createQueryBuilder('events', 'event')
        .leftJoinAndSelect('event.category', 'category')
        .where('event.id = :id', { id })
        .getOne();

      return event as EventWithCategory | null;
    });
  }

  async getLatestStatistics(
    eventId: string
  ): Promise<EventStatistics | null> {
    return await useEntityManager(async (entityManager) => {
      const stats = await entityManager
        .createQueryBuilder(EventStatisticsEntity, 'stats')
        .where('stats.event_id = :id', { id: eventId })
        .orderBy('stats.snapshot_at', 'DESC')
        .limit(1)
        .getOne();

      return stats as EventStatistics | null;
    });
  }

  async getEventStatistics(
    eventId: string,
    timeRange: TimeRange
  ): Promise<EventStatistics[]> {
    const stats = await findLatestEventStatistics(eventId, timeRange);
    return stats as EventStatistics[];
  }

  async getAllEventStatistics(eventId: string): Promise<EventStatistics[]> {
    return await useEntityManager(async (entityManager) => {
      const stats = await entityManager
        .createQueryBuilder(EventStatisticsEntity, 'stats')
        .where('stats.event_id = :id', { id: eventId })
        .orderBy('stats.snapshot_at', 'ASC')
        .getMany();

      return stats as EventStatistics[];
    });
  }

  async getEventCategories(
    timeRange: TimeRange
  ): Promise<EventCategoryStats> {
    const cacheKey = CacheService.buildKey('event:categories', timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const stats = await getEventCategoryStats(timeRange);

        return {
          categories: stats.map((s: { name: string }) => s.name),
          counts: stats.map((s: { count: string }) => parseInt(s.count, 10)),
        };
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getInfluenceUsers(eventId: string): Promise<InfluenceUser[]> {
    const cacheKey = CacheService.buildKey('event:influence_users', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const topUsers = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .innerJoin('nlp.post', 'post')
            .select('jsonb_extract_path_text(post.user, \'id\')', 'userid')
            .addSelect(
              'jsonb_extract_path_text(post.user, \'screen_name\')',
              'name'
            )
            .addSelect(
              'jsonb_extract_path_text(post.user, \'followers_count\')',
              'followers'
            )
            .addSelect('COUNT(post.id)', 'postcount')
            .addSelect(
              'SUM(post.attitudes_count + post.comments_count + post.reposts_count)',
              'totalinteractions'
            )
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere('post.deleted_at IS NULL')
            .groupBy('userid, name, followers')
            .orderBy('totalinteractions', 'DESC')
            .limit(10)
            .getRawMany();

          return topUsers.map((user: {
            userid: string;
            name: string;
            followers: string;
            postcount: string;
            totalinteractions: string;
          }) => {
            const totalInteractions = parseInt(user.totalinteractions || '0', 10);
            const followers = parseInt(user.followers || '0', 10);
            const postCount = parseInt(user.postcount || '0', 10);

            const influence = Math.min(
              100,
              Math.round(
                totalInteractions * INFLUENCE_WEIGHTS.INTERACTION +
                  (followers / 1000) * INFLUENCE_WEIGHTS.FOLLOWERS +
                  postCount * INFLUENCE_WEIGHTS.POST_COUNT
              )
            );

            return {
              userId: user.userid || '',
              username: user.name || '未知用户',
              influence,
              postCount,
              followers,
              interactionCount: totalInteractions,
              sentimentScore: 0.5,
            };
          });
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getEventKeywords(
    eventId: string
  ): Promise<Array<{ keyword: string; weight: number; sentiment: string }>> {
    const cacheKey = CacheService.buildKey('event:keywords', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const nlpResults = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .where('nlp.event_id = :eventId', { eventId })
            .getMany();

          const keywordMap = new Map<
            string,
            { totalWeight: number; sentiment: string; count: number }
          >();

          nlpResults.forEach((result) => {
            const keywords = result.keywords || [];
            keywords.forEach((kw) => {
              const existing = keywordMap.get(kw.keyword);
              if (existing) {
                existing.totalWeight += kw.weight;
                existing.count += 1;
              } else {
                keywordMap.set(kw.keyword, {
                  totalWeight: kw.weight,
                  sentiment: kw.sentiment || 'neutral',
                  count: 1,
                });
              }
            });
          });

          return Array.from(keywordMap.entries())
            .map(([keyword, data]) => ({
              keyword,
              weight: Math.round(data.totalWeight * 100) / 100,
              sentiment: data.sentiment,
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 100);
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getGeographicDistribution(
    eventId: string
  ): Promise<GeographicDistribution[]> {
    const cacheKey = CacheService.buildKey('event:geographic', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const locationData = await entityManager
            .createQueryBuilder(WeiboPostEntity, 'post')
            .innerJoin(PostNLPResultEntity, 'nlp', 'nlp.post_id = post.id')
            .select(
              `COALESCE(
                NULLIF(post.region_name, ''),
                NULLIF(jsonb_extract_path_text(post.user, 'location'), ''),
                '未知'
              )`,
              'location'
            )
            .addSelect(
              'COUNT(DISTINCT jsonb_extract_path_text(post.user, \'id\'))',
              'usercount'
            )
            .addSelect('COUNT(post.id)', 'postcount')
            .addSelect(
              'AVG((nlp.sentiment->>\'positive_prob\')::numeric - (nlp.sentiment->>\'negative_prob\')::numeric)',
              'avgsentiment'
            )
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere('post.deleted_at IS NULL')
            .groupBy('location')
            .orderBy('usercount', 'DESC')
            .limit(20)
            .getRawMany();

          const totalUsers = locationData.reduce(
            (sum, item) => sum + parseInt(item.usercount || '0', 10),
            0
          );

          return locationData.map((item: {
            location: string;
            usercount: string;
            postcount: string;
            avgsentiment: string;
          }) => {
            const userCount = parseInt(item.usercount || '0', 10);
            const postCount = parseInt(item.postcount || '0', 10);
            const avgSentiment = parseFloat(item.avgsentiment || '0');

            const normalizedSentiment =
              avgSentiment !== 0
                ? Math.max(0, Math.min(1, (avgSentiment + 1) / 2))
                : this.mockService.generateSentiment();

            return {
              region: (item.location || '未知').replace('发布于 ', ''),
              count: userCount,
              percentage:
                totalUsers > 0
                  ? Math.round((userCount / totalUsers) * 10000) / 100
                  : 0,
              posts: postCount || this.mockService.estimatePostCount(userCount),
              sentiment: Math.round(normalizedSentiment * 100) / 100,
            };
          });
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  private async getStatisticsBatch(
    eventIds: string[],
    timeRange: TimeRange
  ): Promise<EventStatistics[]> {
    if (eventIds.length === 0) return [];

    return await useEntityManager(async (entityManager) => {
      const dateRange = getDateRangeByTimeRange(timeRange);

      const results = await entityManager
        .createQueryBuilder(EventStatisticsEntity, 'stats')
        .where('stats.event_id IN (:...eventIds)', { eventIds })
        .andWhere('stats.snapshot_at >= :start', { start: dateRange.start })
        .andWhere('stats.snapshot_at <= :end', { end: dateRange.end })
        .orderBy('stats.snapshot_at', 'DESC')
        .getMany();

      const latestByEvent = new Map<string, EventStatistics>();
      results.forEach((stat) => {
        if (!latestByEvent.has(stat.event_id)) {
          latestByEvent.set(stat.event_id, stat as EventStatistics);
        }
      });

      return Array.from(latestByEvent.values());
    });
  }

  private mapEventToListItem(
    event: EventWithCategory,
    statistics: EventStatistics[]
  ): EventListItem {
    const latestStats =
      statistics && statistics.length > 0 ? statistics[0] : null;

    return {
      id: event.id,
      title: event.title,
      description: event.description || '',
      postCount: latestStats?.post_count || 0,
      userCount: latestStats?.user_count || 0,
      sentiment:
        latestStats?.sentiment ||
        (event.sentiment as SentimentScore) || {
          positive: 0,
          negative: 0,
          neutral: 0,
        },
      hotness: event.hotness,
      trend: this.calculateTrend(statistics),
      category: event.category?.name || '未分类',
      keywords: [],
      createdAt: event.created_at.toISOString(),
      lastUpdate: event.updated_at.toISOString(),
      trendData:
        statistics
          ?.slice(0, 7)
          .reverse()
          .map((s) => s?.hotness || 0) || [],
    };
  }

  private calculateTrend(
    statistics: EventStatistics[]
  ): 'up' | 'down' | 'stable' {
    if (!statistics || statistics.length < 2) return 'stable';

    const current = statistics[0]?.hotness || 0;
    const previous = statistics[1]?.hotness || 0;
    const change = current - previous;

    if (change > TREND_THRESHOLD.UP) return 'up';
    if (change < TREND_THRESHOLD.DOWN) return 'down';
    return 'stable';
  }
}
