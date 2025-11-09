import { Injectable, Inject } from '@sker/core';
import {
  useEntityManager,
  EventStatisticsEntity,
  getDateRangeByTimeRange,
} from '@sker/entities';
import { CacheService, CACHE_TTL } from '../../cache.service';
import type {
  TimeRange,
  EventStatistics,
  EventPropagationPath,
  EventWithCategory,
  TrendDataSeries,
  TimeSeriesData,
  TrendAnalysis,
} from './types';
import {
  TIME_RANGE_GRANULARITY,
  PROPAGATION_USER_TYPES,
  SENTIMENT_WEIGHT,
  HOTNESS_CALCULATION_WEIGHTS,
} from './constants';

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
          const dateRange = getDateRangeByTimeRange(timeRange);
          const granularity = TIME_RANGE_GRANULARITY[timeRange];

          const trendData = await entityManager
            .createQueryBuilder(EventStatisticsEntity, 'stats')
            .select(`DATE_TRUNC('${granularity}', stats.snapshot_at)`, 'date')
            .addSelect('COUNT(DISTINCT stats.event_id)', 'eventcount')
            .addSelect('SUM(stats.user_count)', 'usercount')
            .addSelect('SUM(stats.post_count)', 'postcount')
            .addSelect('AVG(stats.hotness)', 'hotness')
            .where('stats.snapshot_at >= :start', { start: dateRange.start })
            .andWhere('stats.snapshot_at <= :end', { end: dateRange.end })
            .groupBy('date')
            .orderBy('date', 'ASC')
            .getRawMany();

          const categories = trendData.map((d: { date: Date }) =>
            this.formatDate(d.date, granularity)
          );
          const eventCounts = trendData.map((d: { eventcount?: string }) =>
            parseInt(d.eventcount || '0', 10)
          );
          const userCounts = trendData.map((d: { usercount?: string }) =>
            parseInt(d.usercount || '0', 10)
          );
          const postCounts = trendData.map((d: { postcount?: string }) =>
            parseInt(d.postcount || '0', 10)
          );
          const hotness = trendData.map((d: { hotness?: string }) =>
            Math.round(parseFloat(d.hotness || '0'))
          );

          return {
            categories,
            series: [
              { name: '事件数量', data: eventCounts },
              { name: '贴子数量', data: postCounts },
              { name: '参与用户', data: userCounts },
              { name: '热度指数', data: hotness },
            ],
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getEventTimeSeries(
    eventId: string,
    timeRange: TimeRange,
    statistics: EventStatistics[]
  ): Promise<TimeSeriesData> {
    const cacheKey = CacheService.buildKey(
      'event:timeseries',
      eventId,
      timeRange
    );

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const granularity = TIME_RANGE_GRANULARITY[timeRange];

        const categories = statistics
          .map((s) => this.formatDate(s.snapshot_at, granularity))
          .reverse();

        const postData = statistics
          .map((s) => s?.post_count || 0)
          .reverse();
        const userData = statistics
          .map((s) => s?.user_count || 0)
          .reverse();
        const positiveData = statistics
          .map((s) => s?.sentiment?.positive || 0)
          .reverse();
        const negativeData = statistics
          .map((s) => s?.sentiment?.negative || 0)
          .reverse();
        const neutralData = statistics
          .map((s) => s?.sentiment?.neutral || 0)
          .reverse();

        return {
          categories,
          series: [
            { name: '帖子数量', data: postData },
            { name: '用户参与', data: userData },
            { name: '正面情绪', data: positiveData },
            { name: '负面情绪', data: negativeData },
            { name: '中性情绪', data: neutralData },
          ],
        };
      },
      CACHE_TTL.SHORT
    );
  }

  async getEventTrends(
    eventId: string,
    timeRange: TimeRange,
    statistics: EventStatistics[]
  ): Promise<TrendAnalysis> {
    const cacheKey = CacheService.buildKey('event:trends', eventId, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const granularity = TIME_RANGE_GRANULARITY[timeRange];

        const timeline = statistics
          .map((s) => this.formatDate(s.snapshot_at, granularity))
          .reverse();

        const postVolume = statistics
          .map((s) => s?.post_count || 0)
          .reverse();
        const userEngagement = statistics
          .map((s) => s?.user_count || 0)
          .reverse();

        const sentimentScores = statistics
          .map((s) => {
            const positive = s?.sentiment?.positive || 0;
            const negative = s?.sentiment?.negative || 0;
            return Math.round((positive - negative) * 50 + 50);
          })
          .reverse();

        const hotnessData = postVolume.map((posts, index) => {
          const users = userEngagement[index] || 0;
          return Math.round(
            posts * HOTNESS_CALCULATION_WEIGHTS.POSTS +
              users * HOTNESS_CALCULATION_WEIGHTS.USERS
          );
        });

        return {
          timeline,
          postVolume,
          sentimentScores,
          userEngagement,
          hotnessData,
        };
      },
      CACHE_TTL.MEDIUM
    );
  }

  buildPropagationPath(event: EventWithCategory): EventPropagationPath[] {
    const baseCount = event.hotness * 10;

    return Object.values(PROPAGATION_USER_TYPES).map((type) => ({
      userType: type.label,
      userCount: Math.floor(baseCount * type.userRatio),
      postCount: Math.floor(baseCount * type.postRatio),
      influence: type.influence,
    }));
  }

  private formatDate(
    date: Date,
    granularity: 'hour' | 'day' | 'week' | 'month'
  ): string {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();

    switch (granularity) {
      case 'hour':
        return `${month}月${day}日 ${d.getHours()}时`;
      case 'day':
        return `${month}月${day}日`;
      case 'week':
        return `第${Math.ceil(day / 7)}周`;
      case 'month':
        return `${month}月`;
      default:
        return date.toISOString();
    }
  }
}
