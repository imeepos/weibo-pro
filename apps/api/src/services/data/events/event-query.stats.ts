import {
  useEntityManager,
  EventHourlyStatisticsEntity,
  findLatestEventStatistics,
} from '@sker/entities';
import type { EventStatistics, TimeRange } from './types';

/**
 * 事件统计查询模块
 *
 * 负责 EventHourlyStatisticsEntity 相关的查询：
 * - 最新一条统计（getLatestStatistics）
 * - 时间区间统计（getEventStatistics）
 * - 全部统计（getAllEventStatistics）
 * - 批量聚合统计（getStatisticsBatch，供事件列表排序使用）
 *
 * 全部为纯函数，不依赖缓存。
 */

/**
 * 获取事件最新的一条小时统计
 */
export async function getLatestStatistics(
  eventId: string
): Promise<EventStatistics | null> {
  return await useEntityManager(async (entityManager) => {
    const stats = await entityManager
      .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
      .where('stats.event_id = :id', { id: eventId })
      .orderBy('stats.year', 'DESC')
      .addOrderBy('stats.month', 'DESC')
      .addOrderBy('stats.day', 'DESC')
      .addOrderBy('stats.hour', 'DESC')
      .limit(1)
      .getOne();

    if (!stats) return null;

    return {
      event_id: stats.event_id,
      post_count: stats.post_count,
      user_count: stats.user_count,
      sentiment: {
        positive: parseFloat(stats.sentiment_positive.toString()),
        negative: parseFloat(stats.sentiment_negative.toString()),
        neutral: parseFloat(stats.sentiment_neutral.toString())
      },
      hotness: parseFloat(stats.hotness.toString()),
      snapshot_at: new Date(stats.year, stats.month - 1, stats.day, stats.hour)
    } as EventStatistics;
  });
}

/**
 * 获取事件在指定时间区间内的统计
 */
export async function getEventStatistics(
  eventId: string,
  timeRange: TimeRange
): Promise<EventStatistics[]> {
  const stats = await findLatestEventStatistics(eventId, timeRange);
  return stats as EventStatistics[];
}

/**
 * 获取事件全部统计（按时间升序）
 */
export async function getAllEventStatistics(eventId: string): Promise<EventStatistics[]> {
  return await useEntityManager(async (entityManager) => {
    const stats = await entityManager
      .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
      .where('stats.event_id = :id', { id: eventId })
      .orderBy('stats.year', 'ASC')
      .addOrderBy('stats.month', 'ASC')
      .addOrderBy('stats.day', 'ASC')
      .addOrderBy('stats.hour', 'ASC')
      .getMany();

    return stats.map(s => ({
      event_id: s.event_id,
      post_count: s.post_count,
      user_count: s.user_count,
      sentiment: {
        positive: parseFloat(s.sentiment_positive.toString()),
        negative: parseFloat(s.sentiment_negative.toString()),
        neutral: parseFloat(s.sentiment_neutral.toString())
      },
      hotness: parseFloat(s.hotness.toString()),
      snapshot_at: new Date(s.year, s.month - 1, s.day, s.hour)
    })) as EventStatistics[];
  });
}

/**
 * 批量获取多个事件的统计并聚合为单条记录
 *
 * 对每个事件的所有小时记录累加 post_count、加权平均情感、保留最大 hotness。
 */
export async function getStatisticsBatch(
  eventIds: string[],
  _timeRange?: TimeRange
): Promise<EventStatistics[]> {
  if (eventIds.length === 0) return [];

  return await useEntityManager(async (entityManager) => {
    const results = await entityManager
      .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
      .where('stats.event_id IN (:...eventIds)', { eventIds })
      .orderBy('stats.year', 'DESC')
      .addOrderBy('stats.month', 'DESC')
      .addOrderBy('stats.day', 'DESC')
      .addOrderBy('stats.hour', 'DESC')
      .getMany();

    // 聚合统计：累加所有时间段的 post_count、user_count 等
    const aggregatedByEvent = new Map<string, {
      event_id: string;
      post_count: number;
      user_count: number;
      nlp_weight: number;
      sentiment_positive: number;
      sentiment_negative: number;
      sentiment_neutral: number;
      hotness: number;
      latestTimestamp: Date;
    }>();

    results.forEach((stat) => {
      if (!aggregatedByEvent.has(stat.event_id)) {
        aggregatedByEvent.set(stat.event_id, {
          event_id: stat.event_id,
          post_count: 0,
          user_count: 0,
          nlp_weight: 0,
          sentiment_positive: 0,
          sentiment_negative: 0,
          sentiment_neutral: 0,
          hotness: 0,
          latestTimestamp: new Date(stat.year, stat.month - 1, stat.day, stat.hour)
        });
      }
      const agg = aggregatedByEvent.get(stat.event_id)!;

      // 累加帖子数和用户数
      agg.post_count += stat.post_count;
      agg.user_count = Math.max(agg.user_count, stat.user_count);

      // 情感加权平均（使用 nlp_count 作为权重）
      const weight = stat.nlp_count || 1;
      agg.nlp_weight += weight;
      agg.sentiment_positive += parseFloat(stat.sentiment_positive.toString()) * weight;
      agg.sentiment_negative += parseFloat(stat.sentiment_negative.toString()) * weight;
      agg.sentiment_neutral += parseFloat(stat.sentiment_neutral.toString()) * weight;

      // 热度保留最大值
      agg.hotness = Math.max(agg.hotness, parseFloat(stat.hotness.toString()));

      // 更新时间戳为最新
      const currentTimestamp = new Date(stat.year, stat.month - 1, stat.day, stat.hour);
      if (currentTimestamp > agg.latestTimestamp) {
        agg.latestTimestamp = currentTimestamp;
      }
    });

    // 转换为 EventStatistics 格式
    return Array.from(aggregatedByEvent.values()).map((agg) => {
      const totalWeight = agg.nlp_weight || 1;
      return {
        event_id: agg.event_id,
        post_count: agg.post_count,
        user_count: agg.user_count,
        sentiment: {
          positive: parseFloat((agg.sentiment_positive / totalWeight).toFixed(4)),
          negative: parseFloat((agg.sentiment_negative / totalWeight).toFixed(4)),
          neutral: parseFloat((agg.sentiment_neutral / totalWeight).toFixed(4))
        },
        hotness: parseFloat(agg.hotness.toString()),
        snapshot_at: agg.latestTimestamp
      };
    });
  });
}
