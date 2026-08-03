import { useEntityManager, EventHourlyStatisticsEntity } from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../cache.service';
import type { EventEngagementTrend, EventAnomaly, EventPeak } from './types';

/**
 * 事件互动指标查询模块
 *
 * 基于 EventHourlyStatisticsEntity 的互动/异常/峰值分析查询：
 * - 互动趋势（getEngagementTrend）
 * - 异常检测（getAnomalies）
 * - 峰值检测（getPeaks）
 */
export class EventEngagementQueries {
  constructor(private readonly cacheService: CacheService) {}

  async getEngagementTrend(eventId: string): Promise<EventEngagementTrend[]> {
    const cacheKey = CacheService.buildKey('event:engagement_trend', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const stats = await entityManager
            .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
            .where('stats.event_id = :eventId', { eventId })
            .orderBy('stats.year', 'ASC')
            .addOrderBy('stats.month', 'ASC')
            .addOrderBy('stats.day', 'ASC')
            .addOrderBy('stats.hour', 'ASC')
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
          });
        });
      },
      CACHE_TTL.SHORT
    );
  }

  async getAnomalies(eventId: string): Promise<EventAnomaly[]> {
    const cacheKey = CacheService.buildKey('event:anomalies', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const stats = await entityManager
            .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
            .where('stats.event_id = :eventId', { eventId })
            .orderBy('stats.year', 'ASC')
            .addOrderBy('stats.month', 'ASC')
            .addOrderBy('stats.day', 'ASC')
            .addOrderBy('stats.hour', 'ASC')
            .getMany();

          const anomalies: EventAnomaly[] = [];

          // 使用移动窗口（7个点）计算更稳定的基准值
          const windowSize = 7;

          for (let i = windowSize; i < stats.length; i++) {
            const current = stats[i]!;

            // 获取窗口内的数据点
            const windowStart = Math.max(0, i - windowSize);
            const windowData = stats.slice(windowStart, i);

            // 计算窗口内的平均值和标准差
            const postCounts = windowData.map(d => d.post_count);
            const avgPostCount = postCounts.reduce((a, b) => a + b, 0) / postCounts.length;
            const variance = postCounts.reduce((sum, val) => sum + Math.pow(val - avgPostCount, 2), 0) / postCounts.length;
            const stdDev = Math.sqrt(variance);

            // 避免除零
            const safeStdDev = stdDev < 1 ? 1 : stdDev;

            // 检测峰值（超过 1.5 倍标准差，阈值降低）
            if (current.post_count > avgPostCount + 1.5 * safeStdDev) {
              anomalies.push({
                timestamp: new Date(current.year, current.month - 1, current.day, current.hour).toISOString(),
                type: 'spike',
                metric: 'post_count',
                value: current.post_count,
                expected: Math.round(avgPostCount),
                confidence: Math.min(1, (current.post_count - avgPostCount) / (2.5 * safeStdDev)),
              });
            }
            // 检测低谷（低于 1.5 倍标准差，且平均值足够大）
            else if (current.post_count < avgPostCount - 1.5 * safeStdDev && avgPostCount > 5) {
              anomalies.push({
                timestamp: new Date(current.year, current.month - 1, current.day, current.hour).toISOString(),
                type: 'drop',
                metric: 'post_count',
                value: current.post_count,
                expected: Math.round(avgPostCount),
                confidence: Math.min(1, (avgPostCount - current.post_count) / (2.5 * safeStdDev)),
              });
            }

            // 检测情感突变（阈值提高，减少误判）
            const prev = stats[i - 1]!;
            const sentimentChange = Math.abs(current.sentiment_positive - prev.sentiment_positive);
            if (sentimentChange > 0.4) {
              anomalies.push({
                timestamp: new Date(current.year, current.month - 1, current.day, current.hour).toISOString(),
                type: 'sentiment_shift',
                metric: 'sentiment_positive',
                value: parseFloat(current.sentiment_positive.toString()),
                expected: parseFloat(prev.sentiment_positive.toString()),
                confidence: Math.min(1, sentimentChange / 0.6),
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
            const current = reversedStats[i]!;
            const neighbors = [
              reversedStats[i - 2]!,
              reversedStats[i - 1]!,
              reversedStats[i + 1]!,
              reversedStats[i + 2]!,
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
}
