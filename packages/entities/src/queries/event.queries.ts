import { useEntityManager } from '../utils';
import { EventEntity } from '../event.entity'
import { EventStatisticsEntity } from '../event-statistics.entity'
import { SentimentScore } from '../types/sentiment';
export type TimeRange =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'halfYear'
  | 'lastHalfYear'
  | 'thisYear'
  | 'lastYear'
  | 'all';

export interface HotEvent {
  id: string;
  title: string;
  postCount: number;
  sentiment: SentimentScore;
  hotness: number;
  trend: 'up' | 'down' | 'stable';
  trendData: number[];
}

/** 根据时间范围计算日期范围 */
export const getDateRangeByTimeRange = (timeRange: TimeRange): { start: Date; end: Date } => {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  switch (timeRange) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisWeek':
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case 'lastWeek':
      start.setDate(start.getDate() - start.getDay() - 7);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - end.getDay() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisMonth':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'lastMonth':
      start.setMonth(start.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'thisQuarter':
      const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'lastQuarter':
      const lastQuarterStartMonth = Math.floor((start.getMonth() - 3) / 3) * 3;
      start.setMonth(lastQuarterStartMonth, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(lastQuarterStartMonth + 2, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'halfYear':
      start.setMonth(start.getMonth() - 6);
      break;
    case 'lastHalfYear':
      start.setMonth(start.getMonth() - 12);
      end.setMonth(end.getMonth() - 6);
      break;
    case 'thisYear':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'lastYear':
      start.setFullYear(start.getFullYear() - 1, 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(end.getFullYear() - 1, 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    case 'all':
    default:
      start = new Date(0); // 从1970年开始
      break;
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
const mapEventToHotEvent = (event: EventEntity, statistics: EventStatisticsEntity[]): HotEvent => {
  return {
    id: event.id,
    title: event.title,
    postCount: calculatePostCount(statistics),
    sentiment: getSentiment(event, statistics),
    hotness: event.hotness,
    trend: calculateTrend(statistics),
    trendData: generateTrendData(statistics, event.hotness)
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
  timeRange: TimeRange,
  options?: { category?: string; search?: string; limit?: number }
) =>
  useEntityManager(async m => {
    const dateRange = getDateRangeByTimeRange(timeRange);
    let query = m
      .createQueryBuilder(EventEntity, 'event')
      .leftJoinAndSelect('event.category', 'category')
      .where('event.deleted_at IS NULL')
      .andWhere('event.status = :status', { status: 'active' });

    if (timeRange !== 'all') {
      query = query
        .andWhere('event.occurred_at >= :start', { start: dateRange.start })
        .andWhere('event.occurred_at <= :end', { end: dateRange.end });
    }

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
export const getEventCategoryStats = (timeRange: TimeRange) =>
  useEntityManager(async m => {
    const dateRange = getDateRangeByTimeRange(timeRange);

    const query = m
      .createQueryBuilder(EventEntity, 'event')
      .leftJoin('event.category', 'category')
      .select('category.name', 'name')
      .addSelect('COUNT(event.id)', 'count')
      .where('event.deleted_at IS NULL')
      .andWhere('event.status = :status', { status: 'active' })
      .groupBy('category.name')
      .orderBy('count', 'DESC');

    if (timeRange !== 'all') {
      query
        .andWhere('event.occurred_at >= :start', { start: dateRange.start })
        .andWhere('event.occurred_at <= :end', { end: dateRange.end });
    }

    return await query.getRawMany();
  });
