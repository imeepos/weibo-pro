import {
  useEntityManager,
  EventHourlyStatisticsEntity,
  getDateRangeByTimeRange,
  HourlyStatisticsHelper,
} from '@sker/entities';
import { TREND_THRESHOLD } from './constants';
import type {
  EventStatistics,
  EventListItem,
  EventWithCategory,
  SentimentScore,
  TimeRange,
} from './types';

/**
 * 事件热度与列表构建模块
 *
 * 负责事件展示热度的计算（带时间衰减）以及列表项的映射构建。
 * 全部为纯函数，不依赖缓存。
 */

/**
 * 计算事件的展示热度（带时间衰减）
 *
 * 查询时动态计算，根据统计记录的新旧程度应用时间衰减权重
 * 越新的数据权重越高，实现"热度随时间衰减"的效果
 *
 * @param eventIds 事件ID数组
 * @param timeRange 时间范围
 * @param lambda 衰减系数（默认 0.05，半衰期约14小时）
 * @returns Map<eventId, displayHotness>
 */
export async function calculateDecayedHotnessForEvents(
  eventIds: string[],
  timeRange: TimeRange,
  lambda: number = 0.05
): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();

  return useEntityManager(async (entityManager) => {
    const dateRange = getDateRangeByTimeRange(timeRange);
    const currentTime = new Date();

    // 获取所有统计记录
    const results = await entityManager
      .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
      .where('stats.event_id IN (:...eventIds)', { eventIds })
      .andWhere(
        `make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) >= :start`,
        { start: dateRange.start }
      )
      .andWhere(
        `make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) <= :end`,
        { end: dateRange.end }
      )
      .getMany();

    // 按 event_id 分组
    const statsByEvent = new Map<string, EventHourlyStatisticsEntity[]>();
    results.forEach(stat => {
      if (!statsByEvent.has(stat.event_id)) {
        statsByEvent.set(stat.event_id, []);
      }
      statsByEvent.get(stat.event_id)!.push(stat);
    });

    // 计算每个事件的展示热度
    const decayedHotnessMap = new Map<string, number>();
    statsByEvent.forEach((stats, eventId) => {
      const displayHotness = HourlyStatisticsHelper.calculateEventDisplayHotness(
        stats,
        currentTime,
        lambda
      );
      decayedHotnessMap.set(eventId, displayHotness);
    });

    return decayedHotnessMap;
  });
}

/**
 * 将事件详情与统计映射为事件列表项
 */
export function mapEventToListItem(
  event: EventWithCategory,
  statistics: EventStatistics[],
  displayHotness: number
): EventListItem {
  const latestStats =
    statistics && statistics.length > 0 ? statistics[0] : null;

  // 如果 stats 的 sentiment 是默认值且没有实际数据，fallback 到 event.sentiment
  const hasValidSentiment = latestStats?.sentiment && latestStats.sentiment.positive + latestStats.sentiment.negative > 0.01;
  const sentiment = hasValidSentiment
    ? latestStats!.sentiment
    : (event.sentiment as SentimentScore) || { positive: 0, negative: 0, neutral: 0 };

  return {
    id: event.id,
    title: event.title,
    description: event.description || '',
    postCount: latestStats?.post_count || 0,
    userCount: latestStats?.user_count || 0,
    sentiment,
    hotness: displayHotness,
    trend: calculateTrend(statistics),
    category: event.category?.name || '未分类',
    keywords: Array.isArray(event.keywords)
      ? event.keywords.map(k => String(k)).filter(k => k && k !== 'undefined' && k !== 'null')
      : [],
    occurredAt: event.occurred_at ? event.occurred_at.toISOString() : null,
    createdAt: event.created_at.toISOString(),
    updatedAt: event.updated_at.toISOString(),
    trendData:
      statistics
        ?.slice(0, 7)
        .reverse()
        .map((s) => s?.hotness || 0) || [],
  };
}

/**
 * 根据相邻统计热度差值计算趋势
 */
export function calculateTrend(
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
