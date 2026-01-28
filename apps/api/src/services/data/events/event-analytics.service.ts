import { Injectable, Inject } from '@sker/core';
import {
  useEntityManager,
  EventHourlyStatisticsEntity,
  EventEntity,
  PostNLPResultEntity,
  WeiboPostEntity,
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

          // 从 events 表按时间分组统计事件数量
          const eventTrendData = await entityManager
            .createQueryBuilder(EventEntity, 'event')
            .select(`DATE_TRUNC('${granularity}', event.created_at)`, 'date')
            .addSelect('COUNT(event.id)', 'eventcount')
            .where('event.deleted_at IS NULL')
            .andWhere('event.created_at >= :start', { start: dateRange.start })
            .andWhere('event.created_at <= :end', { end: dateRange.end })
            .groupBy('date')
            .orderBy('date', 'ASC')
            .getRawMany();

          // 从 event_hourly_statistics 表按时间分组统计帖子、用户、热度
          const statsTrendData = await entityManager
            .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
            .select(`DATE_TRUNC('${granularity}', make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0))`, 'date')
            .addSelect('SUM(stats.user_count)', 'usercount')
            .addSelect('SUM(stats.post_count)', 'postcount')
            .addSelect('AVG(stats.hotness)', 'hotness')
            .where(
              `make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) >= :start`,
              { start: dateRange.start }
            )
            .andWhere(
              `make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) <= :end`,
              { end: dateRange.end }
            )
            .groupBy('date')
            .orderBy('date', 'ASC')
            .getRawMany();

          // 合并两个数据集，以事件趋势数据的时间点为基准
          const statsMap = new Map(
            statsTrendData.map((d: { date: Date; usercount?: string; postcount?: string; hotness?: string }) => [
              new Date(d.date).getTime(),
              d,
            ])
          );

          const categories = eventTrendData.map((d: { date: Date }) =>
            this.formatDate(d.date, granularity)
          );
          const eventCounts = eventTrendData.map((d: { eventcount?: string }) =>
            parseInt(d.eventcount || '0', 10)
          );
          const userCounts = eventTrendData.map((d: { date: Date }) => {
            const stats = statsMap.get(new Date(d.date).getTime());
            return parseInt(stats?.usercount || '0', 10);
          });
          const postCounts = eventTrendData.map((d: { date: Date }) => {
            const stats = statsMap.get(new Date(d.date).getTime());
            return parseInt(stats?.postcount || '0', 10);
          });
          const hotness = eventTrendData.map((d: { date: Date }) => {
            const stats = statsMap.get(new Date(d.date).getTime());
            return Math.round(parseFloat(stats?.hotness || '0'));
          });

          // 从 events 表直接查询事件总数
          const eventCount = await entityManager
            .createQueryBuilder(EventEntity, 'event')
            .where('event.deleted_at IS NULL')
            .andWhere('event.created_at >= :start', { start: dateRange.start })
            .andWhere('event.created_at <= :end', { end: dateRange.end })
            .getCount();

          // 从 event_hourly_statistics 表查询帖子、用户、热度统计
          const totalStats = await entityManager
            .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
            .select('SUM(stats.post_count)', 'totalposts')
            .addSelect('SUM(stats.user_count)', 'totalusers')
            .addSelect('AVG(stats.hotness)', 'avghotness')
            .where(
              `make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) >= :start`,
              { start: dateRange.start }
            )
            .andWhere(
              `make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) <= :end`,
              { end: dateRange.end }
            )
            .getRawOne();

          return {
            categories,
            series: [
              { name: '事件数量', data: eventCounts },
              { name: '贴子数量', data: postCounts },
              { name: '参与用户', data: userCounts },
              { name: '热度指数', data: hotness },
            ],
            totals: {
              totalEvents: eventCount,
              totalPosts: parseInt(totalStats?.totalposts || '0', 10),
              totalUsers: parseInt(totalStats?.totalusers || '0', 10),
              avgHotness: Math.round(parseFloat(totalStats?.avghotness || '0')),
            },
          };
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
          const granularity = TIME_RANGE_GRANULARITY[timeRange];

          const stats = await entityManager
            .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
            .where('stats.event_id = :eventId', { eventId })
            .orderBy('stats.year', 'ASC')
            .addOrderBy('stats.month', 'ASC')
            .addOrderBy('stats.day', 'ASC')
            .addOrderBy('stats.hour', 'ASC')
            .getMany();

          const categories = stats.map((s) =>
            new Date(Date.UTC(s.year, s.month - 1, s.day, s.hour)).toISOString()
          );

          const postData = stats.map((s) => s.post_count || 0);
          const userData = stats.map((s) => s.user_count || 0);
          const positiveData = stats.map((s) => s.sentiment_positive || 0);
          const negativeData = stats.map((s) => s.sentiment_negative || 0);
          const neutralData = stats.map((s) => s.sentiment_neutral || 0);

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
          // 按用户粉丝数区分用户类型，统计真实数据
          const userStats = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .innerJoin('nlp.post', 'post')
            .innerJoin('post.user', 'user')
            .select(
              `CASE
                WHEN user.followers_count >= 100000 THEN '意见领袖'
                WHEN user.followers_count >= 10000 THEN '活跃用户'
                WHEN user.followers_count >= 1000 THEN '普通用户'
                ELSE '围观群众'
              END`,
              'usertype'
            )
            .addSelect('COUNT(DISTINCT user.id)', 'usercount')
            .addSelect('COUNT(post.id)', 'postcount')
            .addSelect(
              'AVG(post.attitudes_count + post.comments_count + post.reposts_count)',
              'avginteraction'
            )
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere('post.deleted_at IS NULL')
            .groupBy('usertype')
            .orderBy('usercount', 'DESC')
            .getRawMany();

          if (userStats.length === 0) {
            return [];
          }

          const totalUsers = userStats.reduce(
            (sum, s) => sum + parseInt(s.usercount || '0', 10),
            0
          );

          return userStats.map((stat: {
            usertype: string;
            usercount: string;
            postcount: string;
            avginteraction: string;
          }) => {
            const userCount = parseInt(stat.usercount || '0', 10);
            const avgInteraction = parseFloat(stat.avginteraction || '0');
            // 影响力基于平均互动量计算
            const influence = Math.min(100, Math.round(Math.log10(avgInteraction + 1) * 25));

            return {
              userType: stat.usertype,
              userCount,
              postCount: parseInt(stat.postcount || '0', 10),
              influence: Math.max(influence, 10), // 最低影响力 10
            };
          });
        });
      },
      CACHE_TTL.MEDIUM
    );
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
