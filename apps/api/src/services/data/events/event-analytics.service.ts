import { Injectable, Inject } from '@sker/core';
import {
  useEntityManager,
  EventHourlyStatisticsEntity,
  WeiboPostEntity,
} from '@sker/entities';
import { CacheService, CACHE_TTL } from '../../cache.service';
import type {
  TimeRange,
  EventPropagationPath,
  TrendDataSeries,
  TimeSeriesData,
  TrendAnalysis,
} from './types';
import {
  TIME_RANGE_GRANULARITY,
  HOTNESS_CALCULATION_WEIGHTS,
} from './constants';
import { fetchTrendData } from './event-analytics.trend';
import { fetchEventTimeSeries } from './event-analytics.timeseries';
import { fetchPropagationPath } from './event-analytics.propagation';
import { formatDate as formatDateUtil } from './event-analytics.format';

@Injectable({ providedIn: 'root' })
export class EventAnalyticsService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getTrendData(timeRange: TimeRange): Promise<TrendDataSeries> {
    const cacheKey = CacheService.buildKey('event:trend', timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          return fetchTrendData(entityManager, timeRange);
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getEventTimeSeries(
    eventId: string,
    timeRange: TimeRange
  ): Promise<TimeSeriesData> {
    const cacheKey = CacheService.buildKey(
      'event:timeseries',
      eventId,
      timeRange
    );

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          return fetchEventTimeSeries(entityManager, eventId, timeRange);
        });
      },
      CACHE_TTL.SHORT
    );
  }

  async getEventTrends(
    eventId: string,
    timeRange: TimeRange
  ): Promise<TrendAnalysis> {
    const cacheKey = CacheService.buildKey('event:trends', eventId, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const granularity = TIME_RANGE_GRANULARITY[timeRange];

          const stats = await entityManager
            .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
            .where('stats.event_id = :eventId', { eventId })
            .orderBy('stats.year', 'ASC')
            .addOrderBy('stats.month', 'ASC')
            .addOrderBy('stats.day', 'ASC')
            .addOrderBy('stats.hour', 'ASC')
            .getMany();

          const timeline = stats.map((s) =>
            this.formatDate(new Date(s.year, s.month - 1, s.day, s.hour), granularity)
          );

          const postVolume = stats.map((s) => s.post_count || 0);
          const userEngagement = stats.map((s) => s.user_count || 0);

          const sentimentScores = stats.map((s) => {
            const positive = s.sentiment_positive || 0;
            const negative = s.sentiment_negative || 0;
            return Math.round((positive - negative) * 50 + 50);
          });

          const hotnessData = postVolume.map((posts, index) => {
            const users = userEngagement[index] || 0;
            return Math.round(
              posts * HOTNESS_CALCULATION_WEIGHTS.POSTS +
                users * HOTNESS_CALCULATION_WEIGHTS.USERS
            );
          });

          // 查询真实的总帖子数（直接从 WeiboPostEntity 查询，简单高效）
          const totalPostsResult = await entityManager
            .createQueryBuilder(WeiboPostEntity, 'post')
            .select('COUNT(post.id)', 'totalpostcount')
            .where('post.event_id = :eventId', { eventId })
            .andWhere('post.deleted_at IS NULL')
            .getRawOne();

          const totalPosts = parseInt(totalPostsResult?.totalpostcount || '0', 10);

          return {
            timeline,
            postVolume,
            sentimentScores,
            userEngagement,
            hotnessData,
            totalPosts, // 添加真实的总帖子数
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async buildPropagationPath(eventId: string): Promise<EventPropagationPath[]> {
    const cacheKey = CacheService.buildKey('event:propagation', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          return fetchPropagationPath(entityManager, eventId);
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  private formatDate(
    date: Date,
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): string {
    return formatDateUtil(date, granularity);
  }
}
