import { Injectable, Inject, Logger, } from '@sker/core';
import {
  WeiboPostEntity,
  PostNLPResultEntity,
  useEntityManager,
  EventHourlyStatisticsEntity,
  EventEntity,
} from '@sker/entities';
import { toInt } from '../../utils/type-converter';
import {
  OverviewStatisticsData,
  OverviewSentiment,
  OverviewLocation,
  TimeRange
} from './types';
import {
  getTimeRangeBoundaries,
  getPreviousTimeRangeBoundaries,
  calculateChangeRate,
  getYesterdayBoundaries,
} from './time-range.utils';
import { getCoordinatesFromProvinceCity } from './location-coordinates';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';

@Injectable({ providedIn: 'root' })
export class OverviewService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService,
    @Inject(Logger, {optional: true})
    private readonly logger?: Logger
  ) {}

  async getStatistics(timeRange: TimeRange): Promise<OverviewStatisticsData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.OVERVIEW_STATS, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchStatistics(timeRange),
      CACHE_TTL.MEDIUM // 统计数据使用5分钟缓存，减少数据库压力
    );
  }

  private async fetchStatistics(timeRange: TimeRange): Promise<OverviewStatisticsData> {
    return useEntityManager(async (manager) => {
      const current = getTimeRangeBoundaries(timeRange);
      const previous = getPreviousTimeRangeBoundaries(timeRange);

      // 从统计表查询当前时间范围的数据
      const currentStats = await this.fetchStatisticsFromTable(manager, current.start, current.end);

      // 从统计表查询上一个时间范围的数据
      const previousStats = await this.fetchStatisticsFromTable(manager, previous.start, previous.end);

      return {
        eventCount: currentStats.eventCount,
        eventCountChange: calculateChangeRate(currentStats.eventCount, previousStats.eventCount),
        postCount: currentStats.postCount,
        postCountChange: calculateChangeRate(currentStats.postCount, previousStats.postCount),
        userCount: currentStats.userCount,
        userCountChange: calculateChangeRate(currentStats.userCount, previousStats.userCount),
        interactionCount: currentStats.interactionCount,
        interactionCountChange: calculateChangeRate(currentStats.interactionCount, previousStats.interactionCount),
      };
    });
  }

  private async fetchStatisticsFromTable(manager: any, start: Date, end: Date) {
    // 从 event_hourly_statistics 表查询数据，确保数据源一致性
    // 注意：stats.year/month/day/hour 存储的是北京时间维度 (UTC+8)
    // 使用 make_timestamp 生成时间戳后，需要减去8小时转换为 UTC 时间进行比较
    // 添加 JOIN events 表以过滤已删除事件，确保与 EventAnalysis 页面数据一致
    const stats = await manager
      .getRepository(EventHourlyStatisticsEntity)
      .createQueryBuilder('stats')
      .innerJoin(EventEntity, 'event', 'event.id = stats.event_id')
      .select('COALESCE(SUM(stats.post_count), 0)', 'postCount')
      .addSelect('COALESCE(SUM(stats.user_count), 0)', 'userCount')
      .addSelect('COALESCE(SUM(stats.comment_count), 0)', 'commentCount')
      .addSelect('COALESCE(SUM(stats.like_count), 0)', 'likeCount')
      .addSelect('COALESCE(SUM(stats.repost_count), 0)', 'repostCount')
      .addSelect('COALESCE(COUNT(DISTINCT stats.event_id), 0)', 'eventCount')
      .where('event.deleted_at IS NULL')
      .andWhere(
        `(make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) - INTERVAL '8 hours') >= :start`,
        { start }
      )
      .andWhere(
        `(make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) - INTERVAL '8 hours') < :end`,
        { end }
      )
      .getRawOne();

    const postCount = toInt(stats?.postCount);
    const userCount = toInt(stats?.userCount);
    const commentCount = toInt(stats?.commentCount);
    const likeCount = toInt(stats?.likeCount);
    const repostCount = toInt(stats?.repostCount);
    const interactionCount = commentCount + likeCount + repostCount;
    const eventCount = toInt(stats?.eventCount);

    return {
      eventCount,
      postCount,
      userCount,
      interactionCount,
    };
  }

  async getSentiment(timeRange: TimeRange): Promise<OverviewSentiment> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.SENTIMENT_DATA, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchSentimentData(timeRange),
      CACHE_TTL.MEDIUM // 情感数据5分钟缓存
    );
  }

  private async fetchSentimentData(timeRange: TimeRange): Promise<OverviewSentiment> {
    return useEntityManager(async (manager) => {
      const current = getTimeRangeBoundaries(timeRange);
      const previous = getPreviousTimeRangeBoundaries(timeRange);

      // 优先从统计表查询，降级到 NLP 结果表
      let currentSentiment: { positive: number; negative: number; neutral: number };
      let previousSentiment: { positive: number; negative: number; neutral: number };

      try {
        currentSentiment = await this.fetchSentimentFromStatistics(manager, current.start, current.end);
        previousSentiment = await this.fetchSentimentFromStatistics(manager, previous.start, previous.end);
      } catch (error) {
        this.logger?.warn('Statistics table query failed, fallback to NLP results', error);
        currentSentiment = await this.fetchSentimentFromNLPResults(manager, current.start, current.end);
        previousSentiment = await this.fetchSentimentFromNLPResults(manager, previous.start, previous.end);
      }

      // 计算总数
      const total = currentSentiment.positive + currentSentiment.negative + currentSentiment.neutral;

      // 计算百分比
      const positivePercentage = total > 0 ? Math.round((currentSentiment.positive / total) * 100 * 100) / 100 : 0;
      const negativePercentage = total > 0 ? Math.round((currentSentiment.negative / total) * 100 * 100) / 100 : 0;
      const neutralPercentage = total > 0 ? Math.round((currentSentiment.neutral / total) * 100 * 100) / 100 : 0;

      // 计算趋势
      const trend = this.calculateSentimentTrend(currentSentiment, previousSentiment);

      // 计算平均情感分数 (-1 到 1)
      const avgScore = total > 0
        ? Math.round(((currentSentiment.positive - currentSentiment.negative) / total) * 100) / 100
        : 0;

      return {
        positive: currentSentiment.positive,
        negative: currentSentiment.negative,
        neutral: currentSentiment.neutral,
        total,
        positivePercentage,
        negativePercentage,
        neutralPercentage,
        trend,
        avgScore
      };
    });
  }

  private calculateSentimentTrend(
    current: { positive: number; negative: number; neutral: number },
    previous: { positive: number; negative: number; neutral: number }
  ): 'rising' | 'stable' | 'falling' {
    const currentScore = current.positive - current.negative;
    const previousScore = previous.positive - previous.negative;

    const changeRate = previousScore !== 0
      ? (currentScore - previousScore) / previousScore
      : (currentScore > 0 ? 1 : currentScore < 0 ? -1 : 0);

    if (changeRate > 0.05) return 'rising';
    if (changeRate < -0.05) return 'falling';
    return 'stable';
  }

  private async fetchSentimentFromStatistics(manager: any, start: Date, end: Date): Promise<{ positive: number; negative: number; neutral: number }> {
    // 从 EventHourlyStatisticsEntity 聚合情感数据
    // 注意：stats.year/month/day/hour 存储的是北京时间维度 (UTC+8)
    // 添加 JOIN events 表以过滤已删除事件，确保数据一致性
    const stats = await manager
      .getRepository(EventHourlyStatisticsEntity)
      .createQueryBuilder('stats')
      .innerJoin(EventEntity, 'event', 'event.id = stats.event_id')
      .select('COALESCE(SUM(stats.nlp_count), 0)', 'total')
      .addSelect('COALESCE(SUM(stats.sentiment_positive), 0)', 'positive')
      .addSelect('COALESCE(SUM(stats.sentiment_negative), 0)', 'negative')
      .addSelect('COALESCE(SUM(stats.sentiment_neutral), 0)', 'neutral')
      .where('event.deleted_at IS NULL')
      .andWhere(
        `(make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) - INTERVAL '8 hours') >= :start`,
        { start }
      )
      .andWhere(
        `(make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) - INTERVAL '8 hours') < :end`,
        { end }
      )
      .andWhere('stats.nlp_count > 0')
      .getRawOne();

    const total = toInt(stats?.total);
    const positive = toInt(stats?.positive);
    const negative = toInt(stats?.negative);
    const neutral = toInt(stats?.neutral);

    if (total === 0) {
      return { positive: 0, negative: 0, neutral: 0 };
    }

    // 计算百分比
    return {
      positive: Math.round((positive / total) * 100),
      negative: Math.round((negative / total) * 100),
      neutral: Math.round((neutral / total) * 100),
    };
  }

  private async fetchSentimentFromNLPResults(manager: any, start: Date, end: Date): Promise<{ positive: number; negative: number; neutral: number }> {
    // 从 PostNLPResultEntity 聚合情感数据（降级备选）
    const sentimentData = await manager
      .getRepository(PostNLPResultEntity)
      .createQueryBuilder('nlp')
      .innerJoin(WeiboPostEntity, 'post', 'post.id = nlp.post_id')
      .select('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END)`,
        'positiveCount'
      )
      .addSelect(
        `SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END)`,
        'negativeCount'
      )
      .addSelect(
        `SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END)`,
        'neutralCount'
      )
      .where('post.ingested_at >= :start', { start })
      .andWhere('post.ingested_at <= :end', { end })
      .andWhere('post.deleted_at IS NULL')
      .getRawOne();

    const total = toInt(sentimentData?.total);
    const positiveCount = toInt(sentimentData?.positiveCount);
    const negativeCount = toInt(sentimentData?.negativeCount);
    const neutralCount = toInt(sentimentData?.neutralCount);

    if (total === 0) {
      return { positive: 0, negative: 0, neutral: 0 };
    }

    return {
      positive: Math.round((positiveCount / total) * 100),
      negative: Math.round((negativeCount / total) * 100),
      neutral: Math.round((neutralCount / total) * 100),
    };
  }

  async getLocations(timeRange: TimeRange): Promise<OverviewLocation[]> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.OVERVIEW_LOCATIONS, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchLocationsData(timeRange),
      CACHE_TTL.MEDIUM // 地域数据使用5分钟缓存
    );
  }

  private async fetchLocationsData(timeRange: TimeRange): Promise<OverviewLocation[]> {
    return useEntityManager(async (manager) => {
      const current = getTimeRangeBoundaries(timeRange);
      const yesterday = getYesterdayBoundaries();

      // 查询当前时间范围的地域分布
      const currentLocations = await this.fetchLocationData(manager, current.start, current.end);
      // 查询昨天的地域分布（用于计算趋势）
      const yesterdayLocations = await this.fetchLocationData(manager, yesterday.start, yesterday.end);

      // 创建昨天数据的 Map 便于查找
      const yesterdayMap = new Map(
        yesterdayLocations.map((loc: any) => [loc.region, loc.count])
      );

      // 计算总数用于百分比
      const total = currentLocations.reduce((sum: number, loc: any) => sum + loc.count, 0);

      // 计算趋势并补充完整数据
      return currentLocations.map((location: any) => {
        const yesterdayCount = Number(yesterdayMap.get(location?.region) || 0);
        let trend: 'up' | 'down' | 'stable' = 'stable';

        if (yesterdayCount === 0) {
          trend = location?.count > 0 ? 'up' : 'stable';
        } else {
          const changeRate = (location?.count - yesterdayCount) / yesterdayCount;
          if (changeRate > 0.05) {
            trend = 'up';
          } else if (changeRate < -0.05) {
            trend = 'down';
          }
        }
        const region: string = (location?.region || '');
        
        return {
          region: region.replace(`发布于`, '').trim(),
          count: location.count,
          percentage: total > 0 ? Math.round((location.count / total) * 100 * 100) / 100 : 0,
          coordinates: location.coordinates,
          trend,
        };
      });
    });
  }

  private async fetchLocationData(manager: any, start: Date, end: Date) {
    // 从 WeiboPostEntity 聚合地域数据
    // 使用 post.region_name 字段
    const locationData = await manager
      .createQueryBuilder()
      .select('COALESCE(NULLIF(post.region_name, \'\'), \'未知\')', 'location')
      .addSelect('COUNT(*)', 'count')
      .from(WeiboPostEntity, 'post')
      .where('post.ingested_at >= :start', { start })
      .andWhere('post.ingested_at <= :end', { end })
      .andWhere('post.deleted_at IS NULL')
      .groupBy('location')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    return locationData.map((item: any) => {
      const region = (item.location || '未知').replace('发布于', '').trim();
      const count = toInt(item.count);

      // 从地域名称提取坐标
      const coordinates = getCoordinatesFromProvinceCity(region, null);

      return {
        region,
        count,
        coordinates,
      };
    });
  }
}