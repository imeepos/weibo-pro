import { Injectable, Inject } from '@sker/core';
import {
  EventEntity,
  WeiboPostEntity,
  PostNLPResultEntity,
  useEntityManager,
} from '@sker/entities';
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
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getStatistics(timeRange: TimeRange): Promise<OverviewStatisticsData> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.OVERVIEW_STATS, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchStatistics(timeRange),
      CACHE_TTL.SHORT // 统计数据实时性要求高，1分钟缓存
    );
  }

  private async fetchStatistics(timeRange: TimeRange): Promise<OverviewStatisticsData> {
    return useEntityManager(async (manager) => {
      const current = getTimeRangeBoundaries(timeRange);
      const previous = getPreviousTimeRangeBoundaries(timeRange);

      // 查询当前时间范围的统计数据
      const currentStats = await this.fetchStatisticsData(manager, current.start, current.end);

      // 查询上一个时间范围的统计数据（用于计算变化率）
      const previousStats = await this.fetchStatisticsData(manager, previous.start, previous.end);

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

  private async fetchStatisticsData(manager: any, start: Date, end: Date) {
    // 查询事件数量
    const eventCount = await manager
      .getRepository(EventEntity)
      .createQueryBuilder('event')
      .where('event.occurred_at >= :start', { start })
      .andWhere('event.occurred_at <= :end', { end })
      .andWhere('event.deleted_at IS NULL')
      .getCount();

    // 查询帖子数量和互动数
    const postStats = await manager
      .getRepository(WeiboPostEntity)
      .createQueryBuilder('post')
      .select('COUNT(DISTINCT post.id)', 'postCount')
      .addSelect('COUNT(DISTINCT post.user)', 'userCount')
      .addSelect('SUM(post.comments_count + post.reposts_count + post.attitudes_count)', 'interactionCount')
      .where('post.ingested_at >= :start', { start })
      .andWhere('post.ingested_at <= :end', { end })
      .andWhere('post.deleted_at IS NULL')
      .getRawOne();

    return {
      eventCount,
      postCount: parseInt(postStats?.postCount || '0', 10),
      userCount: parseInt(postStats?.userCount || '0', 10),
      interactionCount: parseInt(postStats?.interactionCount || '0', 10),
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

      // 查询当前时间范围的情感数据
      const currentSentiment = await this.fetchSentiment(manager, current.start, current.end);

      // 查询上一个时间范围的情感数据
      const previousSentiment = await this.fetchSentiment(manager, previous.start, previous.end);

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

  private async fetchSentiment(manager: any, start: Date, end: Date) {
    // 从 PostNLPResultEntity 聚合情感数据
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

    const total = parseInt(sentimentData?.total || '0', 10);
    const positiveCount = parseInt(sentimentData?.positiveCount || '0', 10);
    const negativeCount = parseInt(sentimentData?.negativeCount || '0', 10);
    const neutralCount = parseInt(sentimentData?.neutralCount || '0', 10);

    // 计算百分比
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
    const cacheKey = CacheService.buildKey('overview:locations', timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchLocationsData(timeRange),
      CACHE_TTL.MEDIUM // 地域数据5分钟缓存
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
        const yesterdayCount = Number(yesterdayMap.get(location.region) || 0);
        let trend: 'up' | 'down' | 'stable' = 'stable';

        if (yesterdayCount === 0) {
          trend = location.count > 0 ? 'up' : 'stable';
        } else {
          const changeRate = (location.count - yesterdayCount) / yesterdayCount;
          if (changeRate > 0.05) {
            trend = 'up';
          } else if (changeRate < -0.05) {
            trend = 'down';
          }
        }

        return {
          region: location.region,
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
      const region = item.location || '未知';
      const count = parseInt(item.count || '0', 10);

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