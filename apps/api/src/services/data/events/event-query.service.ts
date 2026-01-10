import { Injectable, Inject } from '@sker/core';
import {
  useEntityManager,
  EventStatisticsEntity,
  EventHourlyStatisticsEntity,
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
  EventSentimentHotness,
  EventSentimentDistribution,
  EventSentimentIntensity,
  EventKeywordTimeSeries,
  EventKeywordBySentiment,
  EventNegativeKeywordAlert,
  EventEventTypeDistribution,
  EventEngagementTrend,
  EventAnomaly,
  EventPeak,
} from './types';
import { TREND_THRESHOLD, INFLUENCE_WEIGHTS } from './constants';

@Injectable({ providedIn: 'root' })
export class EventQueryService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getEventList(
    timeRange?: TimeRange,
    pagination?: { page: number; pageSize: number; search?: string; category?: string }
  ): Promise<{
    data: EventListItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const search = pagination?.search;
    const category = pagination?.category;

    const cacheKey = CacheService.buildKey(
      CACHE_KEYS.EVENT_DETAIL,
      'list',
      timeRange || 'all',
      page.toString(),
      pageSize.toString(),
      search || '',
      category || ''
    );

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // 获取总数
        const total = await this.getEventCount(timeRange, { search, category });

        // 获取分页数据
        const events = await findEventList(timeRange, {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          search,
          category
        });

        const eventIds = events.map((e) => e.id);

        const statsTimeRange = timeRange || '24h';
        const allStatistics = await this.getStatisticsBatch(eventIds, statsTimeRange);
        const statsMap = new Map(allStatistics.map((s) => [s.event_id, s]));

        const data = events.map((event) => {
          const stats = statsMap.get(event.id);
          return this.mapEventToListItem(
            event,
            stats ? [stats] : []
          );
        });

        return {
          data,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        };
      },
      CACHE_TTL.SHORT
    );
  }

  private async getEventCount(
    timeRange?: TimeRange,
    filters?: { search?: string; category?: string }
  ): Promise<number> {
    return await useEntityManager(async (entityManager) => {
      let query = entityManager
        .createQueryBuilder('events', 'event')
        .leftJoin('event.category', 'category')
        .where('event.deleted_at IS NULL')
        .andWhere('event.status = :status', { status: 'active' });

      if (timeRange) {
        const dateRange = getDateRangeByTimeRange(timeRange);
        query = query
          .andWhere('COALESCE(event.occurred_at, event.created_at) >= :start', { start: dateRange.start })
          .andWhere('COALESCE(event.occurred_at, event.created_at) <= :end', { end: dateRange.end });
      }

      if (filters?.search) {
        query = query.andWhere(
          '(event.title ILIKE :search OR event.description ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      if (filters?.category) {
        query = query.andWhere('category.name = :category', { category: filters.category });
      }

      return await query.getCount();
    });
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
            .innerJoin('post.user', 'user')
            .select('user.id', 'userid')
            .addSelect('user.screen_name', 'name')
            .addSelect('user.followers_count', 'followers')
            .addSelect('COUNT(post.id)', 'postcount')
            .addSelect(
              'SUM(post.attitudes_count + post.comments_count + post.reposts_count)',
              'totalinteractions'
            )
            .addSelect(
              'AVG((nlp.sentiment->>\'positive_prob\')::numeric)',
              'avgsentiment'
            )
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere('post.deleted_at IS NULL')
            .groupBy('user.id, user.screen_name, user.followers_count')
            .orderBy('totalinteractions', 'DESC')
            .limit(10)
            .getRawMany();

          return topUsers.map((user: {
            userid: string;
            name: string;
            followers: string;
            postcount: string;
            totalinteractions: string;
            avgsentiment: string;
          }) => {
            const totalInteractions = parseInt(user.totalinteractions || '0', 10);
            const followers = parseInt(user.followers || '0', 10);
            const postCount = parseInt(user.postcount || '0', 10);
            const avgSentiment = parseFloat(user.avgsentiment || '0.5');

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
              sentimentScore: Math.round(avgSentiment * 100) / 100,
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
            .innerJoin('post.user', 'user')
            .innerJoin(PostNLPResultEntity, 'nlp', 'nlp.post_id = post.id')
            .select(
              `COALESCE(
                NULLIF(post.region_name, ''),
                NULLIF(user.location, ''),
                '未知'
              )`,
              'location'
            )
            .addSelect('COUNT(DISTINCT user.id)', 'usercount')
            .addSelect('COUNT(post.id)', 'postcount')
            .addSelect(
              'AVG((nlp.sentiment->>\'positive_prob\')::numeric - (nlp.sentiment->>\'negative_prob\')::numeric)',
              'avgsentiment'
            )
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere('post.deleted_at IS NULL')
            .groupBy('COALESCE(NULLIF(post.region_name, \'\'), NULLIF(user.location, \'\'), \'未知\')')
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

            // 将情感值 [-1, 1] 归一化到 [0, 1]，无数据时返回 0.5（中性）
            const normalizedSentiment =
              avgSentiment !== 0
                ? Math.max(0, Math.min(1, (avgSentiment + 1) / 2))
                : 0.5;

            return {
              region: (item.location || '未知').replace('发布于 ', ''),
              count: userCount,
              percentage:
                totalUsers > 0
                  ? Math.round((userCount / totalUsers) * 10000) / 100
                  : 0,
              posts: postCount,
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

  // 新增：NLP 深度分析查询方法

  async getSentimentHotness(eventId: string): Promise<EventSentimentHotness[]> {
    const cacheKey = CacheService.buildKey('event:sentiment_hotness', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const results = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .innerJoin('nlp.post', 'post')
            .innerJoin(EventStatisticsEntity, 'stats', 'stats.event_id = nlp.event_id')
            .select('nlp.post_id', 'postId')
            .addSelect(
              '(nlp.sentiment->>\'positive_prob\')::numeric - (nlp.sentiment->>\'negative_prob\')::numeric',
              'sentimentScore'
            )
            .addSelect('stats.hotness', 'hotness')
            .addSelect('nlp.created_at', 'timestamp')
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere('post.deleted_at IS NULL')
            .orderBy('nlp.created_at', 'DESC')
            .limit(500)
            .getRawMany();

          return results.map((row: {
            postId: string;
            sentimentScore: string;
            hotness: string;
            timestamp: Date;
          }) => ({
            postId: row.postId,
            sentimentScore: parseFloat(row.sentimentScore || '0'),
            hotness: parseFloat(row.hotness || '0'),
            timestamp: row.timestamp.toISOString(),
          }));
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getSentimentDistribution(eventId: string): Promise<EventSentimentDistribution> {
    const cacheKey = CacheService.buildKey('event:sentiment_distribution', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const results = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .select('nlp.sentiment->>\'overall\'', 'overall')
            .addSelect('COUNT(*)', 'count')
            .where('nlp.event_id = :eventId', { eventId })
            .groupBy('nlp.sentiment->>\'overall\'')
            .getRawMany();

          const distribution = {
            positive: { count: 0, percentage: 0 },
            negative: { count: 0, percentage: 0 },
            neutral: { count: 0, percentage: 0 },
          };

          let total = 0;
          results.forEach((row: { overall: string; count: string }) => {
            const count = parseInt(row.count || '0', 10);
            total += count;
            if (row.overall in distribution) {
              distribution[row.overall as keyof typeof distribution].count = count;
            }
          });

          if (total > 0) {
            distribution.positive.percentage = Math.round((distribution.positive.count / total) * 10000) / 100;
            distribution.negative.percentage = Math.round((distribution.negative.count / total) * 10000) / 100;
            distribution.neutral.percentage = Math.round((distribution.neutral.count / total) * 10000) / 100;
          }

          return distribution;
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getSentimentIntensity(eventId: string): Promise<EventSentimentIntensity[]> {
    const cacheKey = CacheService.buildKey('event:sentiment_intensity', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const results = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .select('ROUND((nlp.sentiment->>\'confidence\')::numeric * 10) / 10', 'confidence')
            .addSelect('COUNT(*)', 'count')
            .where('nlp.event_id = :eventId', { eventId })
            .groupBy('ROUND((nlp.sentiment->>\'confidence\')::numeric * 10) / 10')
            .orderBy('confidence', 'ASC')
            .getRawMany();

          return results.map((row: { confidence: string; count: string }) => ({
            confidence: parseFloat(row.confidence || '0'),
            count: parseInt(row.count || '0', 10),
          }));
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getKeywordsTimeSeries(eventId: string, topN: number = 20): Promise<EventKeywordTimeSeries[]> {
    const cacheKey = CacheService.buildKey('event:keywords_timeseries', eventId, topN.toString());

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const nlpResults = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .where('nlp.event_id = :eventId', { eventId })
            .orderBy('nlp.created_at', 'ASC')
            .getMany();

          const keywordTimeMap = new Map<string, Array<{ timestamp: string; weight: number }>>();

          nlpResults.forEach((result) => {
            const keywords = result.keywords || [];
            const timestamp = result.created_at.toISOString();

            keywords.forEach((kw) => {
              if (!keywordTimeMap.has(kw.keyword)) {
                keywordTimeMap.set(kw.keyword, []);
              }
              keywordTimeMap.get(kw.keyword)!.push({ timestamp, weight: kw.weight });
            });
          });

          const topKeywords = Array.from(keywordTimeMap.entries())
            .map(([keyword, data]) => ({
              keyword,
              totalWeight: data.reduce((sum, d) => sum + d.weight, 0),
            }))
            .sort((a, b) => b.totalWeight - a.totalWeight)
            .slice(0, topN)
            .map((k) => k.keyword);

          return topKeywords.map((keyword) => ({
            keyword,
            timeData: keywordTimeMap.get(keyword)!,
          }));
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getKeywordsBySentiment(eventId: string): Promise<EventKeywordBySentiment[]> {
    const cacheKey = CacheService.buildKey('event:keywords_by_sentiment', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const nlpResults = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .where('nlp.event_id = :eventId', { eventId })
            .getMany();

          const keywordMap = new Map<string, { totalWeight: number; sentiment: string; count: number }>();

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
              sentiment: data.sentiment as 'positive' | 'negative' | 'neutral',
              count: data.count,
            }))
            .sort((a, b) => b.weight - a.weight);
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getNegativeKeywords(eventId: string, threshold: number = 0.5): Promise<EventNegativeKeywordAlert[]> {
    const cacheKey = CacheService.buildKey('event:negative_keywords', eventId, threshold.toString());

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const keywordsBySentiment = await this.getKeywordsBySentiment(eventId);

        return keywordsBySentiment
          .filter((kw) => kw.sentiment === 'negative' && kw.weight >= threshold)
          .map((kw) => ({
            keyword: kw.keyword,
            weight: kw.weight,
            count: kw.count,
            trend: 'stable' as const,
          }))
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 20);
      },
      CACHE_TTL.SHORT
    );
  }

  async getEventTypes(eventId: string): Promise<EventEventTypeDistribution[]> {
    const cacheKey = CacheService.buildKey('event:event_types', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const results = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .select('nlp.event_type->>\'type\'', 'eventType')
            .addSelect('COUNT(*)', 'count')
            .addSelect('AVG((nlp.event_type->>\'confidence\')::numeric)', 'avgConfidence')
            .addSelect(
              'AVG((nlp.sentiment->>\'positive_prob\')::numeric - (nlp.sentiment->>\'negative_prob\')::numeric)',
              'avgSentiment'
            )
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere("nlp.event_type->>\'type\' IS NOT NULL")
            .andWhere("nlp.event_type->>\'type\' != ''")
            .groupBy('nlp.event_type->>\'type\'')
            .orderBy('count', 'DESC')
            .getRawMany();

          return results.map((row: {
            eventType: string;
            count: string;
            avgConfidence: string;
            avgSentiment: string;
          }) => ({
            eventType: row.eventType || '未知',
            count: parseInt(row.count || '0', 10),
            confidence: Math.round(parseFloat(row.avgConfidence || '0') * 100) / 100,
            avgSentiment: Math.round(parseFloat(row.avgSentiment || '0') * 100) / 100,
          }));
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  // 新增：基于 EventHourlyStatisticsEntity 的互动指标查询

  async getEngagementTrend(eventId: string, limit: number = 168): Promise<EventEngagementTrend[]> {
    const cacheKey = CacheService.buildKey('event:engagement_trend', eventId, limit.toString());

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const stats = await entityManager
            .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
            .where('stats.event_id = :eventId', { eventId })
            .orderBy('stats.year', 'DESC')
            .addOrderBy('stats.month', 'DESC')
            .addOrderBy('stats.day', 'DESC')
            .addOrderBy('stats.hour', 'DESC')
            .limit(limit)
            .getMany();

          return stats.map(s => {
            const engagementRate = s.post_count > 0
              ? (s.comment_count + s.repost_count + s.like_count) / s.post_count
              : 0;

            return {
              timestamp: new Date(s.year, s.month - 1, s.day, s.hour).toISOString(),
              post_count: s.post_count,
              comment_count: s.comment_count,
              repost_count: s.repost_count,
              like_count: s.like_count,
              user_count: s.user_count,
              hotness: parseFloat(s.hotness.toString()),
              engagement_rate: Math.round(engagementRate * 100) / 100,
            };
          }).reverse();
        });
      },
      CACHE_TTL.SHORT
    );
  }

  async getAnomalies(eventId: string, limit: number = 168): Promise<EventAnomaly[]> {
    const cacheKey = CacheService.buildKey('event:anomalies', eventId, limit.toString());

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const stats = await entityManager
            .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
            .where('stats.event_id = :eventId', { eventId })
            .orderBy('stats.year', 'DESC')
            .addOrderBy('stats.month', 'DESC')
            .addOrderBy('stats.day', 'DESC')
            .addOrderBy('stats.hour', 'DESC')
            .limit(limit)
            .getMany();

          const anomalies: EventAnomaly[] = [];
          const reversedStats = stats.reverse();

          for (let i = 1; i < reversedStats.length - 1; i++) {
            const current = reversedStats[i];
            const prev = reversedStats[i - 1];
            const nextStat = reversedStats[i + 1];

            // 计算局部平均值
            const avgPostCount = (prev.post_count + current.post_count + nextStat.post_count) / 3;
            const stdDev = Math.sqrt(
              (
                Math.pow(prev.post_count - avgPostCount, 2) +
                Math.pow(current.post_count - avgPostCount, 2) +
                Math.pow(nextStat.post_count - avgPostCount, 2)
              ) / 3
            );

            // 检测峰值（超过 2 倍标准差）
            if (current.post_count > avgPostCount + 2 * stdDev) {
              anomalies.push({
                timestamp: new Date(current.year, current.month - 1, current.day, current.hour).toISOString(),
                type: 'spike',
                metric: 'post_count',
                value: current.post_count,
                expected: Math.round(avgPostCount),
                confidence: Math.min(1, (current.post_count - avgPostCount) / (3 * stdDev)),
              });
            }

            // 检测低谷（低于 2 倍标准差）
            if (current.post_count < avgPostCount - 2 * stdDev && avgPostCount > 10) {
              anomalies.push({
                timestamp: new Date(current.year, current.month - 1, current.day, current.hour).toISOString(),
                type: 'drop',
                metric: 'post_count',
                value: current.post_count,
                expected: Math.round(avgPostCount),
                confidence: Math.min(1, (avgPostCount - current.post_count) / (3 * stdDev)),
              });
            }

            // 检测情感突变
            const sentimentChange = Math.abs(current.sentiment_positive - prev.sentiment_positive);
            if (sentimentChange > 0.3) {
              anomalies.push({
                timestamp: new Date(current.year, current.month - 1, current.day, current.hour).toISOString(),
                type: 'sentiment_shift',
                metric: 'sentiment_positive',
                value: parseFloat(current.sentiment_positive.toString()),
                expected: parseFloat(prev.sentiment_positive.toString()),
                confidence: Math.min(1, sentimentChange / 0.5),
              });
            }
          }

          return anomalies;
        });
      },
      CACHE_TTL.SHORT
    );
  }

  async getPeaks(eventId: string, limit: number = 168): Promise<EventPeak[]> {
    const cacheKey = CacheService.buildKey('event:peaks', eventId, limit.toString());

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const stats = await entityManager
            .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
            .where('stats.event_id = :eventId', { eventId })
            .orderBy('stats.year', 'DESC')
            .addOrderBy('stats.month', 'DESC')
            .addOrderBy('stats.day', 'DESC')
            .addOrderBy('stats.hour', 'DESC')
            .limit(limit)
            .getMany();

          const peaks: EventPeak[] = [];
          const reversedStats = stats.reverse();

          // 找到全局最大值
          const maxHotness = Math.max(...reversedStats.map(s => parseFloat(s.hotness.toString())));
          const globalPeak = reversedStats.find(s => parseFloat(s.hotness.toString()) === maxHotness);

          if (globalPeak) {
            const engagementRate = globalPeak.post_count > 0
              ? (globalPeak.comment_count + globalPeak.repost_count + globalPeak.like_count) / globalPeak.post_count
              : 0;

            peaks.push({
              timestamp: new Date(globalPeak.year, globalPeak.month - 1, globalPeak.day, globalPeak.hour).toISOString(),
              hotness: parseFloat(globalPeak.hotness.toString()),
              peak_type: 'global',
              metrics: {
                post_count: globalPeak.post_count,
                user_count: globalPeak.user_count,
                engagement_rate: Math.round(engagementRate * 100) / 100,
              },
            });
          }

          // 查找局部峰值（使用简单的峰值检测算法）
          for (let i = 2; i < reversedStats.length - 2; i++) {
            const current = reversedStats[i];
            const neighbors = [
              reversedStats[i - 2],
              reversedStats[i - 1],
              reversedStats[i + 1],
              reversedStats[i + 2],
            ];

            const isLocalPeak = neighbors.every(
              neighbor => parseFloat(neighbor.hotness.toString()) < parseFloat(current.hotness.toString())
            );

            if (isLocalPeak && parseFloat(current.hotness.toString()) > maxHotness * 0.5) {
              const engagementRate = current.post_count > 0
                ? (current.comment_count + current.repost_count + current.like_count) / current.post_count
                : 0;

              peaks.push({
                timestamp: new Date(current.year, current.month - 1, current.day, current.hour).toISOString(),
                hotness: parseFloat(current.hotness.toString()),
                peak_type: 'local',
                metrics: {
                  post_count: current.post_count,
                  user_count: current.user_count,
                  engagement_rate: Math.round(engagementRate * 100) / 100,
                },
              });
            }
          }

          return peaks.sort((a, b) => b.hotness - a.hotness).slice(0, 10);
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getEventUserRelations(eventId: string): Promise<UserRelationNetwork> {
    const cacheKey = CacheService.buildKey('event:user-relations', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const posts = await entityManager
            .createQueryBuilder(PostEntity, 'post')
            .where('post.event_id = :eventId', { eventId })
            .getMany();

          const userIds = [...new Set(posts.map(p => p.user_id))];
          const nodes = userIds.map(userId => ({
            id: userId,
            label: userId,
            type: 'user' as const,
            weight: posts.filter(p => p.user_id === userId).length,
          }));

          const edges: Array<{ source: string; target: string; weight: number; type: string }> = [];
          const edgeMap = new Map<string, number>();

          for (const post of posts) {
            if (post.repost_user_id) {
              const key = `${post.user_id}-${post.repost_user_id}`;
              edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
            }
          }

          edgeMap.forEach((weight, key) => {
            const [source, target] = key.split('-');
            edges.push({ source: source!, target: target!, weight, type: 'repost' });
          });

          return { nodes, edges };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }
}
