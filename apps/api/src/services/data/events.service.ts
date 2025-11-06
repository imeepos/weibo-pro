import { Injectable, Inject } from '@sker/core';
import { HotEvent, TimeRange } from './types';
import {
  useEntityManager,
  EventStatisticsEntity,
  WeiboPostEntity,
  WeiboUserEntity,
  findHotEvents,
  findEventList,
  findLatestEventStatistics,
  getEventCategoryStats,
  getDateRangeByTimeRange
} from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';
import { getCoordinatesFromProvinceCity } from './location-coordinates';

@Injectable({ providedIn: 'root' })
export class EventsService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getEventList(timeRange: TimeRange, params?: { category?: string; search?: string; limit?: number }) {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.EVENT_DETAIL, 'list', timeRange, params?.category || '', params?.search || '');

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const events = await findEventList(timeRange, params);

        // 为每个事件获取统计数据
        const eventsWithStats = await Promise.all(
          events.map(async event => {
            const statistics = await findLatestEventStatistics(event.id, timeRange);
            return this.mapEventToEventItem(event, statistics);
          })
        );

        return {
          success: true,
          data: eventsWithStats,
          message: '获取事件列表成功'
        };
      },
      CACHE_TTL.SHORT
    );
  }

  private mapEventToEventItem(event: any, statistics: any[]) {
    const latestStats = statistics && statistics.length > 0 ? statistics[0] : null;

    return {
      id: event.id,
      title: event.title,
      description: event.description || '',
      postCount: latestStats?.post_count || 0,
      userCount: latestStats?.user_count || 0,
      sentiment: latestStats?.sentiment || event.sentiment || { positive: 0, negative: 0, neutral: 0 },
      hotness: event.hotness,
      trend: this.calculateTrend(statistics),
      category: event.category?.name || '未分类',
      keywords: [], // TODO: 从 NLP 结果提取关键词
      createdAt: event.created_at.toISOString(),
      lastUpdate: event.updated_at.toISOString(),
      trendData: statistics?.slice(0, 7).reverse().map((s: any) => s?.hotness || 0) || []
    };
  }

  private calculateTrend(statistics: any[]): 'up' | 'down' | 'stable' {
    if (!statistics || statistics.length < 2) return 'stable';

    const current = statistics[0]?.hotness || 0;
    const previous = statistics[1]?.hotness || 0;
    const change = current - previous;

    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  async getEventCategories(timeRange: TimeRange) {
    const cacheKey = CacheService.buildKey('event:categories', timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const stats = await getEventCategoryStats(timeRange);

        return {
          success: true,
          data: {
            categories: stats.map((s: any) => s.name),
            counts: stats.map((s: any) => parseInt(s.count, 10))
          },
          message: '获取事件分类数据成功'
        };
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getTrendData(timeRange: TimeRange) {
    const cacheKey = CacheService.buildKey('event:trend', timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          const dateRange = getDateRangeByTimeRange(timeRange);

          // 使用 DATE_TRUNC 聚合时间序列数据
          const granularity = this.determineGranularity(timeRange);
          const trendData = await entityManager
            .createQueryBuilder(EventStatisticsEntity, 'stats')
            .select(`DATE_TRUNC('${granularity}', stats.snapshot_at)`, 'date')
            .addSelect('COUNT(DISTINCT stats.event_id)', 'eventCount')
            .addSelect('SUM(stats.user_count)', 'userCount')
            .where('stats.snapshot_at >= :start', { start: dateRange.start })
            .andWhere('stats.snapshot_at <= :end', { end: dateRange.end })
            .groupBy('date')
            .orderBy('date', 'ASC')
            .getRawMany();

          const categories = trendData.map((d: any) => this.formatDate(d.date, granularity));
          const eventCounts = trendData.map((d: any) => parseInt(d.eventCount || '0', 10));
          const userCounts = trendData.map((d: any) => parseInt(d.userCount || '0', 10));

          return {
            success: true,
            data: {
              categories,
              series: [
                { name: '事件数量', data: eventCounts },
                { name: '参与用户', data: userCounts }
              ]
            },
            message: '获取趋势数据成功'
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  private determineGranularity(timeRange: TimeRange): 'hour' | 'day' | 'week' | 'month' {
    switch (timeRange) {
      case 'today':
      case 'yesterday':
        return 'hour';
      case 'thisWeek':
      case 'lastWeek':
        return 'day';
      case 'thisMonth':
      case 'lastMonth':
        return 'week';
      default:
        return 'month';
    }
  }

  private formatDate(date: Date, granularity: string): string {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();

    switch (granularity) {
      case 'hour':
        return `${month}月${day}日 ${d.getHours()}时`;
      case 'day':
        return `${month}月${day}日`;
      case 'week':
        return `第${Math.ceil(day / 7)}周`;
      case 'month':
        return `${month}月`;
      default:
        return date.toISOString();
    }
  }

  async getHotList(timeRange: TimeRange): Promise<HotEvent[]> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.HOT_EVENTS, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await findHotEvents(timeRange);
      },
      CACHE_TTL.SHORT // 热门事件实时性要求高，1分钟缓存
    );
  }

  async getEventDetail(id: string) {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.EVENT_DETAIL, id);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          // 查询事件基本信息
          const event = await entityManager
            .createQueryBuilder('events', 'event')
            .leftJoinAndSelect('event.category', 'category')
            .where('event.id = :id', { id })
            .getOne();

          if (!event) {
            return {
              success: false,
              data: null,
              message: '事件不存在'
            };
          }

          // 查询最新统计数据
          const latestStats = await entityManager
            .createQueryBuilder(EventStatisticsEntity, 'stats')
            .where('stats.event_id = :id', { id })
            .orderBy('stats.snapshot_at', 'DESC')
            .limit(1)
            .getOne();

          return {
            success: true,
            data: {
              id: event.id,
              title: event.title,
              description: event.description || '',
              category: event.category?.name || '未分类',
              heat: event.hotness,
              sentiment: latestStats?.sentiment || event.sentiment,
              startTime: event.occurred_at?.toISOString() || event.created_at.toISOString(),
              endTime: event.peak_at?.toISOString() || new Date().toISOString(),
              totalPosts: latestStats?.post_count || 0,
              totalUsers: latestStats?.user_count || 0,
              keywords: [] // TODO: 从 NLP 提取
            },
            message: '获取事件详情成功'
          };
        });
      },
      CACHE_TTL.SHORT
    );
  }

  async getEventTimeSeries(id: string, timeRange: TimeRange) {
    const cacheKey = CacheService.buildKey('event:timeseries', id, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          const eventRepository = new EventRepository(entityManager);
          const statistics = await eventRepository.findLatestEventStatistics(id, timeRange);

          const categories = statistics.map((s: any) =>
            this.formatDate(s.snapshot_at, this.determineGranularity(timeRange))
          ).reverse();

          const postData = statistics.map((s: any) => s?.post_count || 0).reverse();
          const userData = statistics.map((s: any) => s?.user_count || 0).reverse();

          return {
            success: true,
            data: {
              categories,
              series: [
                { name: '帖子数量', data: postData },
                { name: '用户参与', data: userData }
              ]
            },
            message: '获取事件时间序列数据成功'
          };
        });
      },
      CACHE_TTL.SHORT
    );
  }

  async getEventTrends(id: string, timeRange: TimeRange) {
    const cacheKey = CacheService.buildKey('event:trends', id, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          const eventRepository = new EventRepository(entityManager);
          const statistics = await eventRepository.findLatestEventStatistics(id, timeRange);

          const categories = statistics.map((s: any) =>
            this.formatDate(s.snapshot_at, this.determineGranularity(timeRange))
          ).reverse();

          const positiveData = statistics.map((s: any) => s?.sentiment?.positive || 0).reverse();
          const negativeData = statistics.map((s: any) => s?.sentiment?.negative || 0).reverse();
          const neutralData = statistics.map((s: any) => s?.sentiment?.neutral || 0).reverse();

          return {
            success: true,
            data: {
              categories,
              series: [
                { name: '正面情绪', data: positiveData },
                { name: '负面情绪', data: negativeData },
                { name: '中性情绪', data: neutralData }
              ]
            },
            message: '获取事件趋势数据成功'
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getInfluenceUsers(id: string) {
    const cacheKey = CacheService.buildKey('event:influence_users', id);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          // 查询该事件相关的微博及其用户,按互动数排序
          const topUsers = await entityManager
            .createQueryBuilder(WeiboPostEntity, 'post')
            .select('jsonb_extract_path_text(post.user, \'id\')', 'userId')
            .addSelect('jsonb_extract_path_text(post.user, \'screen_name\')', 'name')
            .addSelect('jsonb_extract_path_text(post.user, \'followers_count\')', 'followers')
            .addSelect('COUNT(post.id)', 'postCount')
            .addSelect('SUM(post.attitudes_count + post.comments_count + post.reposts_count)', 'totalInteractions')
            .where('post.event_id = :eventId', { eventId: id })
            .andWhere('post.deleted_at IS NULL')
            .groupBy('userId, name, followers')
            .orderBy('totalInteractions', 'DESC')
            .limit(10)
            .getRawMany();

          const users = topUsers.map((user: any) => {
            const totalInteractions = parseInt(user.totalInteractions || '0', 10);
            const followers = parseInt(user.followers || '0', 10);
            const postCount = parseInt(user.postCount || '0', 10);

            // 计算影响力分数: 互动数 * 0.6 + 粉丝数/1000 * 0.3 + 帖子数 * 0.1
            const influence = Math.min(
              100,
              Math.round(totalInteractions * 0.0006 + followers / 1000 * 0.3 + postCount * 0.1)
            );

            return {
              id: user.userId,
              name: user.name,
              influence,
              posts: postCount,
              followers
            };
          });

          return {
            success: true,
            data: users,
            message: '获取影响力用户数据成功'
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getEventGeographic(id: string) {
    const cacheKey = CacheService.buildKey('event:geographic', id);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async entityManager => {
          // 查询该事件相关微博的地域分布
          const locationData = await entityManager
            .createQueryBuilder(WeiboPostEntity, 'post')
            .select([
              `COALESCE(
                NULLIF(post.region_name, ''),
                NULLIF(jsonb_extract_path_text(post.user, 'location'), ''),
                '未知'
              )`,
              'location'
            ])
            .addSelect('COUNT(*)', 'count')
            .where('post.event_id = :eventId', { eventId: id })
            .andWhere('post.deleted_at IS NULL')
            .groupBy('location')
            .orderBy('count', 'DESC')
            .limit(20)
            .getRawMany();

          const categories = locationData.map((item: any) => item.location || '未知');
          const counts = locationData.map((item: any) => parseInt(item.count || '0', 10));

          return {
            success: true,
            data: {
              categories,
              series: [
                { name: '用户数量', data: counts }
              ]
            },
            message: '获取事件地理分布数据成功'
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }
}