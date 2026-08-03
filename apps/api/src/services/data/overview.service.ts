import { Injectable, Inject, Logger, } from '@sker/core';
import { useEntityManager } from '@sker/entities';
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
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';
import {
  fetchStatisticsFromTable as queryStatisticsFromTable,
  fetchSentimentFromStatistics,
  fetchSentimentFromNLPResults,
  fetchLocationData,
} from './overview.queries';

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
      const currentStats = await queryStatisticsFromTable(manager, current.start, current.end);

      // 从统计表查询上一个时间范围的数据
      const previousStats = await queryStatisticsFromTable(manager, previous.start, previous.end);

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

  /**
   * 保留在类上的私有查询方法（供测试直接访问）。
   * 实际查询逻辑见 overview.queries.ts。
   */
  private fetchStatisticsFromTable(manager: any, start: Date, end: Date) {
    return queryStatisticsFromTable(manager, start, end);
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
        currentSentiment = await fetchSentimentFromStatistics(manager, current.start, current.end);
        previousSentiment = await fetchSentimentFromStatistics(manager, previous.start, previous.end);
      } catch (error) {
        this.logger?.warn('Statistics table query failed, fallback to NLP results', error);
        currentSentiment = await fetchSentimentFromNLPResults(manager, current.start, current.end);
        previousSentiment = await fetchSentimentFromNLPResults(manager, previous.start, previous.end);
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
      const currentLocations = await fetchLocationData(manager, current.start, current.end);
      // 查询昨天的地域分布（用于计算趋势）
      const yesterdayLocations = await fetchLocationData(manager, yesterday.start, yesterday.end);

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
}
