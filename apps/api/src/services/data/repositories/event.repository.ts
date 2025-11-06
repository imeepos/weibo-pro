import { EntityManager } from 'typeorm';
import { EventEntity } from '@sker/entities';
import { EventStatisticsEntity } from '@sker/entities';
import { HotEvent, TimeRange } from '../types';
import { type SentimentScore } from '@sker/entities';

export class EventRepository {
  constructor(private readonly entityManager: EntityManager) {}

  /**
   * 获取热门事件列表
   * 基于事件统计数据和热度趋势进行排序
   */
  async findHotEvents(timeRange: TimeRange, limit: number = 20): Promise<HotEvent[]> {
    const dateRange = this.getDateRangeByTimeRange(timeRange);

    // 首先获取活跃的热门事件
    const events = await this.entityManager
      .createQueryBuilder(EventEntity, 'event')
      .where('event.status = :status', { status: 'active' })
      .orderBy('event.hotness', 'DESC')
      .addOrderBy('event.created_at', 'DESC')
      .limit(limit)
      .getMany();

    // 为每个事件获取对应的统计数据和趋势信息
    const eventsWithStats = await Promise.all(
      events.map(async event => {
        const statistics = await this.findLatestEventStatistics(event.id, timeRange);
        return { event, statistics };
      })
    );

    return eventsWithStats.map(({ event, statistics }) =>
      this.mapEventToHotEvent(event, statistics)
    );
  }

  /**
   * 根据时间范围获取最近的事件统计快照
   */
  async findLatestEventStatistics(eventId: string, timeRange: TimeRange) {
    const dateRange = this.getDateRangeByTimeRange(timeRange);

    return await this.entityManager
      .createQueryBuilder(EventStatisticsEntity, 'statistics')
      .where('statistics.event_id = :eventId', { eventId })
      .andWhere('statistics.snapshot_at >= :startDate', { startDate: dateRange.start })
      .andWhere('statistics.snapshot_at <= :endDate', { endDate: dateRange.end })
      .orderBy('statistics.snapshot_at', 'DESC')
      .limit(7) // 获取最近7个数据点用于趋势分析
      .getMany();
  }

  /**
   * 将数据库实体映射为前端需要的HotEvent格式
   */
  private mapEventToHotEvent(event: EventEntity, statistics: EventStatisticsEntity[]): HotEvent {
    return {
      id: event.id,
      title: event.title,
      postCount: this.calculatePostCount(statistics),
      sentiment: this.getSentiment(event, statistics),
      hotness: event.hotness,
      trend: this.calculateTrend(statistics),
      trendData: this.generateTrendData(statistics, event.hotness)
    };
  }

  /**
   * 基于事件统计计算帖子数量
   */
  private calculatePostCount(statistics: EventStatisticsEntity[]): number {
    // 如果有统计快照，使用最新的统计快照数据
    if (statistics && statistics.length > 0) {
      const latestStats = statistics[0];
      return latestStats?.post_count ?? 1000;
    }

    // 如果没有统计快照，返回默认值
    return 1000;
  }

  /**
   * 获取情感分析数据
   */
  private getSentiment(event: EventEntity, statistics: EventStatisticsEntity[]): SentimentScore {
    // 优先使用事件统计中的情感数据
    if (statistics && statistics.length > 0) {
      const latestStats = statistics[0];
      return latestStats?.sentiment ?? event.sentiment;
    }

    // 如果没有统计数据，使用事件本身的情感数据
    return event.sentiment;
  }

  /**
   * 基于热度变化计算趋势
   */
  private calculateTrend(statistics: EventStatisticsEntity[]): 'up' | 'down' | 'stable' {
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
  }

  /**
   * 生成趋势数据
   */
  private generateTrendData(statistics: EventStatisticsEntity[], currentHotness: number): number[] {
    if (!statistics || statistics.length === 0) {
      // 如果没有统计快照，生成模拟趋势数据
      return [45, 52, 68, 72, 85, 88, currentHotness];
    }

    // 使用实际的热度数据生成趋势
    return statistics
      .slice(0, 7) // 取最近7个数据点
      .reverse() // 从早到晚排序
      .map(stat => stat?.hotness ?? 0);
  }

  /**
   * 查询事件列表(支持分类、搜索、分页)
   */
  async findEventList(
    timeRange: TimeRange,
    options?: { category?: string; search?: string; limit?: number }
  ): Promise<EventEntity[]> {
    const dateRange = this.getDateRangeByTimeRange(timeRange);
    let query = this.entityManager
      .createQueryBuilder(EventEntity, 'event')
      .leftJoinAndSelect('event.category', 'category')
      .where('event.deleted_at IS NULL')
      .andWhere('event.status = :status', { status: 'active' });

    // 时间范围过滤
    if (timeRange !== 'all') {
      query = query
        .andWhere('event.occurred_at >= :start', { start: dateRange.start })
        .andWhere('event.occurred_at <= :end', { end: dateRange.end });
    }

    // 分类过滤
    if (options?.category) {
      query = query.andWhere('category.name = :category', { category: options.category });
    }

    // 搜索过滤
    if (options?.search) {
      query = query.andWhere(
        '(event.title ILIKE :search OR event.description ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    // 排序和分页
    return await query
      .orderBy('event.hotness', 'DESC')
      .addOrderBy('event.occurred_at', 'DESC')
      .limit(options?.limit || 20)
      .getMany();
  }

  /**
   * 获取事件分类统计
   */
  async getEventCategoryStats(timeRange: TimeRange) {
    const dateRange = this.getDateRangeByTimeRange(timeRange);

    const query = this.entityManager
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
  }

  /**
   * 根据时间范围计算日期范围
   */
  public getDateRangeByTimeRange(timeRange: TimeRange): { start: Date; end: Date } {
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
  }
}