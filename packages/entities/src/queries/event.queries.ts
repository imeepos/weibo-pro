import { useEntityManager } from '../utils';
import { EventEntity } from '../event.entity'
import { EventHourlyStatisticsEntity } from '../event-hourly-statistics.entity'
import { SentimentScore } from '../types/sentiment';
export type TimeRange = 'all' | '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | '90d' | '180d' | '365d';

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

  // 处理 'all' - 返回从很久以前到现在的时间范围
  if (timeRange === 'all') {
    start.setFullYear(2000, 0, 1); // 从 2000-01-01 开始
    return { start, end };
  }

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

    const result = await m
      .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
      .where('stats.event_id = :eventId', { eventId })
      .andWhere(
        `make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) >= :startDate`,
        { startDate: dateRange.start }
      )
      .andWhere(
        `make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) <= :endDate`,
        { endDate: dateRange.end }
      )
      .orderBy('stats.year', 'DESC')
      .addOrderBy('stats.month', 'DESC')
      .addOrderBy('stats.day', 'DESC')
      .addOrderBy('stats.hour', 'DESC')
      .limit(7)
      .getMany();

    // 转换为兼容 EventStatisticsEntity 的格式
    return result.map(s => ({
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
    }));
  });

/** 基于事件统计计算帖子数量 */
const calculatePostCount = (statistics: Array<{
  post_count: number;
  user_count: number;
  hotness: number;
  sentiment: SentimentScore;
}>): number => {
  if (statistics && statistics.length > 0) {
    const latestStats = statistics[0];
    return latestStats?.post_count ?? 0;
  }
  return 0;
};

/** 获取情感分析数据 */
const getSentiment = (event: EventEntity, statistics: Array<{
  post_count: number;
  user_count: number;
  hotness: number;
  sentiment: SentimentScore;
}>): SentimentScore => {
  if (statistics && statistics.length > 0) {
    const latestStats = statistics[0];
    return latestStats?.sentiment ?? event.sentiment;
  }
  return event.sentiment;
};

/** 基于热度变化计算趋势 */
const calculateTrend = (statistics: Array<{
  post_count: number;
  user_count: number;
  hotness: number;
  sentiment: SentimentScore;
}>): 'up' | 'down' | 'stable' => {
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
const _generateTrendData = (statistics: Array<{
  post_count: number;
  user_count: number;
  hotness: number;
  sentiment: SentimentScore;
}>, currentHotness: number): number[] => {
  if (!statistics || statistics.length === 0) {
    return [currentHotness];
  }

  return statistics
    .slice(0, 7)
    .reverse()
    .map(stat => stat?.hotness ?? 0);
};

/** 将数据库实体映射为前端需要的HotEvent格式 */
const mapEventToHotEvent = (event: EventEntity, statistics: Array<{
  post_count: number;
  user_count: number;
  hotness: number;
  sentiment: SentimentScore;
}>) => {
  const sentimentScore = getSentiment(event, statistics);

  // 根据情感分数确定主导情感
  const dominantSentiment: 'positive' | 'negative' | 'neutral' = sentimentScore.positive >= sentimentScore.negative && sentimentScore.positive >= sentimentScore.neutral
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
export const findHotEvents = (timeRange: TimeRange, limit: number = 20): Promise<HotEvent[]> =>
  useEntityManager(async m => {
    const dateRange = getDateRangeByTimeRange(timeRange);

    const events = await m
      .createQueryBuilder(EventEntity, 'event')
      .where('event.status = :status', { status: 'active' })
      .andWhere('event.deleted_at IS NULL')
      .andWhere('COALESCE(event.occurred_at, event.created_at) >= :start', { start: dateRange.start })
      .andWhere('COALESCE(event.occurred_at, event.created_at) <= :end', { end: dateRange.end })
      .orderBy('event.hotness', 'DESC')
      .addOrderBy('COALESCE(event.occurred_at, event.created_at)', 'DESC')
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
  timeRange?: TimeRange,
  options?: { category?: string; search?: string; limit?: number; offset?: number }
) =>
  useEntityManager(async m => {
    const query = m
      .createQueryBuilder(EventEntity, 'event')
      .leftJoinAndSelect('event.category', 'category')
      .where('event.deleted_at IS NULL')
      .andWhere('event.status = :status', { status: 'active' });

    // 只有传了 timeRange 才按时间范围过滤（使用 COALESCE 优先事件发生时间）
    if (timeRange) {
      const dateRange = getDateRangeByTimeRange(timeRange);
      query
        .andWhere('COALESCE(event.occurred_at, event.created_at) >= :start', { start: dateRange.start })
        .andWhere('COALESCE(event.occurred_at, event.created_at) <= :end', { end: dateRange.end });
    }

    if (options?.category) {
      query.andWhere('category.name = :category', { category: options.category });
    }

    if (options?.search) {
      query.andWhere(
        '(event.title ILIKE :search OR event.description ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    query
      .orderBy('event.hotness', 'DESC')
      .addOrderBy('event.created_at', 'DESC');

    // 支持分页
    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    return await query.getMany();
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
      .andWhere('COALESCE(event.occurred_at, event.created_at) >= :start', { start: dateRange.start })
      .andWhere('COALESCE(event.occurred_at, event.created_at) <= :end', { end: dateRange.end })
      .groupBy('category.name')
      .orderBy('count', 'DESC');

    return await query.getRawMany();
  });
