import {
  useEntityManager,
  EventHourlyStatisticsEntity,
  EventEntity,
  getDateRangeByTimeRange,
} from '@sker/entities';
import type {
  TimeRange,
  TrendDataSeries,
} from './types';
import { TIME_RANGE_GRANULARITY } from './constants';
import { formatDate } from './event-analytics.format';

/**
 * 获取整体趋势数据：
 * - 从 events 表按时间分组统计事件数量
 * - 从 event_hourly_statistics 表按时间分组统计帖子、用户、热度
 * - 合并两个数据集，并计算总览统计
 */
export async function fetchTrendData(
  entityManager: any,
  timeRange: TimeRange,
): Promise<TrendDataSeries> {
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
  // 添加 JOIN events 表以过滤已删除事件
  const statsTrendData = await entityManager
    .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
    .innerJoin(EventEntity, 'event', 'event.id = stats.event_id')
    .select(`DATE_TRUNC('${granularity}', make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0))`, 'date')
    .addSelect('SUM(stats.user_count)', 'usercount')
    .addSelect('SUM(stats.post_count)', 'postcount')
    .addSelect('AVG(stats.hotness)', 'hotness')
    .where('event.deleted_at IS NULL')
    .andWhere(
      `(make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) - INTERVAL '8 hours') >= :start`,
      { start: dateRange.start }
    )
    .andWhere(
      `(make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) - INTERVAL '8 hours') < :end`,
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
    formatDate(d.date, granularity)
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

  // 从 event_hourly_statistics 表查询事件总数、帖子、用户、热度统计
  // 添加 JOIN events 表以过滤已删除事件，确保数据一致性
  const totalStats = await entityManager
    .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
    .innerJoin(EventEntity, 'event', 'event.id = stats.event_id')
    .select('COUNT(DISTINCT stats.event_id)', 'totalevents')
    .addSelect('SUM(stats.post_count)', 'totalposts')
    .addSelect('SUM(stats.user_count)', 'totalusers')
    .addSelect('AVG(stats.hotness)', 'avghotness')
    .where('event.deleted_at IS NULL')
    .andWhere(
      `(make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) - INTERVAL '8 hours') >= :start`,
      { start: dateRange.start }
    )
    .andWhere(
      `(make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) - INTERVAL '8 hours') < :end`,
      { end: dateRange.end }
    )
    .getRawOne();

  const eventCount = parseInt(totalStats?.totalevents || '0', 10);

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
}
