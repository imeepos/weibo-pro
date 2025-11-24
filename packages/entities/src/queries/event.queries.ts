import { useEntityManager } from '../utils';
import { EventEntity } from '../event.entity'
import { EventStatisticsEntity } from '../event-statistics.entity'
import { SentimentScore } from '../types/sentiment';
export type TimeRange = '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | '90d' | '180d' | '365d';

export interface HotEvent {
  id: string;
  title: string;
  heat: number;
  posts: number;
  users: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  trend: 'rising' | 'stable' | 'falling';
}

/** 根据时间范围计算日期范围 */
export const getDateRangeByTimeRange = (timeRange: TimeRange = '24h'): { start: Date; end: Date } => {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  // 解析时间范围字符串 (格式: '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | '90d' | '180d' | '365d')
  const match = timeRange.match(/^(\d+)([hd])$/);
  if (!match) {
    // 默认返回最近24小时
    start.setHours(now.getHours() - 24);
    return { start, end };
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  if (unit === 'h') {
    // 小时
    start.setHours(now.getHours() - value);
  } else if (unit === 'd') {
    // 天
    start.setDate(now.getDate() - value);
  }

  return { start, end };
};

/** 根据时间范围获取最近的事件统计快照 */
export const findLatestEventStatistics = (eventId: string, timeRange: TimeRange) =>
  useEntityManager(async m => {
    const dateRange = getDateRangeByTimeRange(timeRange);

    return await m
      .createQueryBuilder(EventStatisticsEntity, 'statistics')
      .where('statistics.event_id = :eventId', { eventId })
      .andWhere('statistics.snapshot_at >= :startDate', { startDate: dateRange.start })
      .andWhere('statistics.snapshot_at <= :endDate', { endDate: dateRange.end })
      .orderBy('statistics.snapshot_at', 'DESC')
      .limit(7)
      .getMany();
  });

/** 基于事件统计计算帖子数量 */
const calculatePostCount = (statistics: EventStatisticsEntity[]): number => {
  if (statistics && statistics.length > 0) {
    const latestStats = statistics[0];
    return latestStats?.post_count ?? 1000;
  }
  return 1000;
};

/** 获取情感分析数据 */
const getSentiment = (event: EventEntity, statistics: EventStatisticsEntity[]): SentimentScore => {
  if (statistics && statistics.length > 0) {
    const latestStats = statistics[0];
    return latestStats?.sentiment ?? event.sentiment;
  }
  return event.sentiment;
};

/** 基于热度变化计算趋势 */
const calculateTrend = (statistics: EventStatisticsEntity[]): 'up' | 'down' | 'stable' => {
  if (!statistics || statistics.length < 2) {
    return 'stable';
  }

  const recentStats = statistics.slice(0, 2);
  const currentHotness = recentStats[0]?.hotness ?? 0;
  const previousHotness = recentStats[1]?.hotness ?? 0;

  const change = currentHotness - previousHotness;

  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
};

/** 生成趋势数据 */
const generateTrendData = (statistics: EventStatisticsEntity[], currentHotness: number): number[] => {
  if (!statistics || statistics.length === 0) {
    return [45, 52, 68, 72, 85, 88, currentHotness];
  }

  return statistics
    .slice(0, 7)
    .reverse()
    .map(stat => stat?.hotness ?? 0);
};

/** 将数据库实体映射为前端需要的HotEvent格式 */
const mapEventToHotEvent = (event: EventEntity, statistics: EventStatisticsEntity[]) => {
  const sentimentScore = getSentiment(event, statistics);

  // 根据情感分数确定主导情感
  const dominantSentiment = sentimentScore.positive >= sentimentScore.negative && sentimentScore.positive >= sentimentScore.neutral
    ? 'positive'
    : sentimentScore.negative >= sentimentScore.positive && sentimentScore.negative >= sentimentScore.neutral
    ? 'negative'
    : 'neutral';

  const trend = calculateTrend(statistics);
  const trendMapping = {
    'up': 'rising' as const,
    'down': 'falling' as const,
    'stable': 'stable' as const
  };

  return {
    id: event.id,
    title: event.title,
    heat: event.hotness,
    posts: calculatePostCount(statistics),
    users: statistics[0]?.user_count || 0,
    sentiment: dominantSentiment,
    trend: trendMapping[trend]
  };
};

/** 获取热门事件列表 */
export const findHotEvents = (timeRange: TimeRange, limit: number = 20) =>
  useEntityManager(async m => {
    const dateRange = getDateRangeByTimeRange(timeRange);

    const events = await m
      .createQueryBuilder(EventEntity, 'event')
      .where('event.status = :status', { status: 'active' })
      .orderBy('event.hotness', 'DESC')
      .addOrderBy('event.created_at', 'DESC')
      .limit(limit)
      .getMany();

    const eventsWithStats = await Promise.all(
      events.map(async event => {
        const statistics = await findLatestEventStatistics(event.id, timeRange);
        return { event, statistics };
      })
    );

    return eventsWithStats.map(({ event, statistics }) =>
      mapEventToHotEvent(event, statistics)
    );
  });

/** 查询事件列表(支持分类、搜索、分页) */
export const findEventList = (
  timeRange: TimeRange = '24h',
  options?: { category?: string; search?: string; limit?: number }
) =>
  useEntityManager(async m => {
    const dateRange = getDateRangeByTimeRange(timeRange);
    let query = m
      .createQueryBuilder(EventEntity, 'event')
      .leftJoinAndSelect('event.category', 'category')
      .where('event.deleted_at IS NULL')
      .andWhere('event.status = :status', { status: 'active' })
      .andWhere('event.occurred_at >= :start', { start: dateRange.start })
      .andWhere('event.occurred_at <= :end', { end: dateRange.end });

    if (options?.category) {
      query = query.andWhere('category.name = :category', { category: options.category });
    }

    if (options?.search) {
      query = query.andWhere(
        '(event.title ILIKE :search OR event.description ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    return await query
      .orderBy('event.hotness', 'DESC')
      .addOrderBy('event.occurred_at', 'DESC')
      .limit(options?.limit || 20)
      .getMany();
  });

/** 获取事件分类统计 */
export const getEventCategoryStats = (timeRange: TimeRange = '24h') =>
  useEntityManager(async m => {
    const dateRange = getDateRangeByTimeRange(timeRange);

    const query = m
      .createQueryBuilder(EventEntity, 'event')
      .leftJoin('event.category', 'category')
      .select('category.name', 'name')
      .addSelect('COUNT(event.id)', 'count')
      .where('event.deleted_at IS NULL')
      .andWhere('event.status = :status', { status: 'active' })
      .andWhere('event.occurred_at >= :start', { start: dateRange.start })
      .andWhere('event.occurred_at <= :end', { end: dateRange.end })
      .groupBy('category.name')
      .orderBy('count', 'DESC');

    return await query.getRawMany();
  });
