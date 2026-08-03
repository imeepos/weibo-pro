import { Injectable, Inject } from '@sker/core';
import {
  useEntityManager,
  EventEntity,
  WeiboPostEntity,
  PostNLPResultEntity,
  findEventList,
  getDateRangeByTimeRange,
} from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../cache.service';
import { getStructuredLogger } from '../../../utils/logger';
import type {
  TimeRange, HotEvent, EventListItem, EventWithCategory, EventStatistics,
  EventCategoryStats, InfluenceUser, GeographicResponse, EventSentimentHotness,
  EventSentimentDistribution, EventSentimentIntensity, EventKeywordTimeSeries,
  EventKeywordBySentiment, EventNegativeKeywordAlert, EventEventTypeDistribution,
  EventEngagementTrend, EventAnomaly, EventPeak, UserRelationNetwork,
} from './types';
import { EventBasicQueries } from './event-query.basic';
import { EventKeywordQueries } from './event-query.keywords';
import { EventSentimentQueries } from './event-query.sentiment';
import { EventEngagementQueries } from './event-query.engagement';
import { EventUserQueries } from './event-query.users';
import { calculateDecayedHotnessForEvents, mapEventToListItem } from './event-query.hotness';
import { getStatisticsBatch, getLatestStatistics, getEventStatistics, getAllEventStatistics } from './event-query.stats';

/**
 * 最大热度计算事件数量限制
 *
 * 当事件数量超过此阈值时，系统会回退到使用数据库的 hotness 字段排序，
 * 避免在内存中计算所有事件的衰减热度导致性能问题。
 *
 * 注意：该值是硬编码的常量，如需动态配置可移至环境变量或配置文件。
 */
const MAX_HOTNESS_CALCULATION_EVENTS = 1000;

@Injectable({ providedIn: 'root' })
export class EventQueryService {
  private readonly basicQueries: EventBasicQueries;
  private readonly keywordQueries: EventKeywordQueries;
  private readonly sentimentQueries: EventSentimentQueries;
  private readonly engagementQueries: EventEngagementQueries;
  private readonly userQueries: EventUserQueries;

  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {
    this.basicQueries = new EventBasicQueries(cacheService);
    this.keywordQueries = new EventKeywordQueries(cacheService);
    this.sentimentQueries = new EventSentimentQueries(cacheService);
    this.engagementQueries = new EventEngagementQueries(cacheService);
    this.userQueries = new EventUserQueries(cacheService);
  }

  /**
   * 根据模式清空缓存
   */
  async clearCacheByPattern(pattern: string): Promise<void> {
    // 将完整的缓存键转换为模式（移除具体的事件ID等参数）
    // 对于精确匹配的单键，直接删除
    await this.cacheService.del(pattern);
  }

  async getEventList(
    timeRange?: TimeRange,
    pagination?: { page: number; pageSize: number; search?: string; category?: string; lambda?: number }
  ): Promise<{
    data: EventListItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const search = pagination?.search;
    const category = pagination?.category;
    const lambda = pagination?.lambda ?? 0.05;

    const cacheKey = CacheService.buildKey(
      CACHE_KEYS.EVENT_DETAIL,
      'list',
      timeRange || 'all',
      page.toString(),
      pageSize.toString(),
      search || '',
      category || '',
      lambda.toString()
    );

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // 【修改】第一步：获取符合条件的所有事件ID和分页标记
        const { ids: allEventIds, needsPaging } = await this.getEventIds(timeRange, { search, category });
        const total = allEventIds.length;

        if (total === 0) {
          return {
            data: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0
          };
        }

        const statsTimeRange = timeRange || '24h';

        // 【性能优化】当事件数量超过阈值时，回退到数据库排序
        //
        // 回退逻辑说明：
        // 1. 当事件数量 > MAX_HOTNESS_CALCULATION_EVENTS 时，计算所有事件的衰减热度会导致性能问题
        // 2. 回退使用数据库的 hotness 字段排序（该字段由正常流程定时更新）
        // 3. 回退模式不使用 lambda 参数进行时间衰减计算，使用数据库持久化的 hotness 值
        // 4. total 使用 allEventIds.length，这是符合条件的总事件数，与排序方式无关
        //
        // 局限性：
        // - 回退模式不应用实时时间衰减，热度值可能不够"新鲜"
        // - 建议通过后台任务定期更新 hotness 字段以保持数据新鲜度
        if (needsPaging) {
          // 记录回退触发情况，便于监控
          getStructuredLogger().warn('Event query fallback to database sorting due to large event count', {
            type: 'performance_fallback',
            eventCount: total,
            threshold: MAX_HOTNESS_CALCULATION_EVENTS,
            timeRange: statsTimeRange,
            page,
            pageSize
          });

          // 使用原有的 findEventList 逻辑（按数据库 hotness 排序）
          const events = await findEventList(statsTimeRange, {
            limit: pageSize,
            offset: (page - 1) * pageSize,
            search,
            category
          });

          // 获取当前页事件ID的统计数据
          const paginatedIds = events.map(e => e.id);
          const allStatistics = await getStatisticsBatch(paginatedIds, statsTimeRange);

          // 构建返回数据（使用数据库持久化的 hotness 值）
          const data = events.map((event) => {
            const stats = allStatistics.find(s => s.event_id === event.id);
            const displayHotness = parseFloat(event.hotness.toString());
            return mapEventToListItem(
              event,
              stats ? [stats] : [],
              displayHotness
            );
          });

          return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
          };
        }

        // 【正常流程】第二步：计算所有事件的衰减热度
        const displayHotnessMap = await calculateDecayedHotnessForEvents(
          allEventIds,
          statsTimeRange,
          lambda
        );

        // 【修改】第三步：按热度排序所有事件ID
        const sortedEventIds = allEventIds.sort((a, b) => {
          const hotnessA = displayHotnessMap.get(a) ?? 0;
          const hotnessB = displayHotnessMap.get(b) ?? 0;
          return hotnessB - hotnessA; // 降序
        });

        // 调试日志：记录排序后的前10个事件的热度
        getStructuredLogger().info('Event hotness sorting result', {
          type: 'hotness_sort_debug',
          eventCount: sortedEventIds.length,
          eventsWithStats: displayHotnessMap.size,
          top10: sortedEventIds.slice(0, 10).map(id => ({
            eventId: id.substring(0, 8),
            hotness: Math.round((displayHotnessMap.get(id) ?? 0) * 100) / 100
          }))
        });

        // 【修改】第四步：手动分页
        const paginatedIds = sortedEventIds.slice((page - 1) * pageSize, page * pageSize);

        // 【修改】第五步：获取分页后的事件详情
        const events = await this.getEventsByIds(paginatedIds);
        const allStatistics = await getStatisticsBatch(paginatedIds, statsTimeRange);

        // 【修改】第六步：构建返回数据（不需要再排序）
        const data = events.map((event) => {
          const stats = allStatistics.find(s => s.event_id === event.id);
          const displayHotness = Math.round((displayHotnessMap.get(event.id) ?? 0) * 100) / 100;
          return mapEventToListItem(
            event,
            stats ? [stats] : [],
            displayHotness
          );
        });

        // 持久化实时热度到数据库（异步，不阻塞返回）
        setImmediate(async () => {
          try {
            await useEntityManager(async (entityManager) => {
              for (const [eventId, newHotness] of displayHotnessMap.entries()) {
                await entityManager.update(EventEntity, eventId, { hotness: newHotness });
              }
            });
            getStructuredLogger().info('Successfully persisted event hotness to database', {
              type: 'hotness_persisted',
              eventCount: displayHotnessMap.size,
              timeRange: statsTimeRange,
              lambda
            });
          } catch (error) {
            getStructuredLogger().error('Failed to persist event hotness to database', {
              type: 'hotness_persist_error',
              eventCount: displayHotnessMap.size,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        });

        return {
          data,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        };
      },
      CACHE_TTL.SHORT
    );
  }

  /**
   * 获取符合条件的所有事件ID（用于计算热度后再分页）
   */
  private async getEventIds(
    timeRange?: TimeRange,
    filters?: { search?: string; category?: string }
  ): Promise<{ ids: string[]; needsPaging: boolean }> {
    return await useEntityManager(async (entityManager) => {
      const query = entityManager
        .createQueryBuilder('events', 'event')
        .leftJoin('event.category', 'category')
        .select('event.id', 'id')
        .where('event.deleted_at IS NULL')
        .andWhere('event.status = :status', { status: 'active' });

      if (timeRange) {
        const dateRange = getDateRangeByTimeRange(timeRange);
        query.andWhere('COALESCE(event.occurred_at, event.created_at) >= :start', { start: dateRange.start })
          .andWhere('COALESCE(event.occurred_at, event.created_at) <= :end', { end: dateRange.end });
      }

      if (filters?.search) {
        query.andWhere(
          '(event.title ILIKE :search OR event.description ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      if (filters?.category) {
        query.andWhere('category.name = :category', { category: filters.category });
      }

      const result = await query.getRawMany();
      const ids = result.map(r => r.id);
      const needsPaging = ids.length > MAX_HOTNESS_CALCULATION_EVENTS;

      return { ids, needsPaging };
    });
  }

  /**
   * 根据ID数组获取事件详情（保持输入顺序）
   */
  private async getEventsByIds(ids: string[]): Promise<EventWithCategory[]> {
    if (ids.length === 0) return [];

    return await useEntityManager(async (entityManager) => {
      const events = await entityManager
        .createQueryBuilder(EventEntity, 'event')
        .leftJoinAndSelect('event.category', 'category')
        .where('event.id IN (:...ids)', { ids })
        .getMany();

      // 按输入 IDs 的顺序重新排列，确保排序后的顺序不被打乱
      const eventMap = new Map(events.map(e => [e.id, e]));
      return ids
        .map(id => eventMap.get(id))
        .filter((e): e is EventEntity => e !== undefined);
    });
  }

  async getGeographicDistribution(
    eventId: string
  ): Promise<GeographicResponse> {
    const cacheKey = CacheService.buildKey('event:geographic', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          // 第一步：查询真实的总帖子数、总用户数、总地区数和全局平均情感
          const totalStats = await entityManager
            .createQueryBuilder(WeiboPostEntity, 'post')
            .innerJoin('post.user', 'user')
            .leftJoin(PostNLPResultEntity, 'nlp', 'nlp.post_id = post.id')
            .select('COUNT(post.id)', 'totalpostcount')
            .addSelect('COUNT(DISTINCT user.id)', 'totalusercount')
            .addSelect(`COUNT(DISTINCT COALESCE(
              NULLIF(post.region_name, ''),
              NULLIF(user.location, ''),
              '未知'
            ))`, 'totalregioncount')
            .addSelect(
              'AVG((nlp.sentiment->>\'positive_prob\')::numeric - (nlp.sentiment->>\'negative_prob\')::numeric)',
              'globalavgsentiment'
            )
            .where('post.event_id = :eventId', { eventId })
            .andWhere('post.deleted_at IS NULL')
            .getRawOne();

          const realTotalPosts = parseInt(totalStats?.totalpostcount || '0', 10);
          const realTotalUsers = parseInt(totalStats?.totalusercount || '0', 10);
          const realTotalRegions = parseInt(totalStats?.totalregioncount || '0', 10);
          const globalAvgSentiment = parseFloat(totalStats?.globalavgsentiment || '0');
          // 将全局情感值 [-1, 1] 归一化到 [0, 1]，无数据时返回 0.5（中性）
          const normalizedGlobalSentiment = globalAvgSentiment !== 0
            ? Math.round(Math.max(0, Math.min(1, (globalAvgSentiment + 1) / 2)) * 100) / 100
            : 0.5;

          // 第二步：查询前20个地区的详细数据
          const locationData = await entityManager
            .createQueryBuilder(WeiboPostEntity, 'post')
            .innerJoin('post.user', 'user')
            .innerJoin(PostNLPResultEntity, 'nlp', 'nlp.post_id = post.id')
            .select(
              `COALESCE(
                NULLIF(post.region_name, ''),
                NULLIF(user.location, ''),
                '未知'
              )`,
              'location'
            )
            .addSelect('COUNT(DISTINCT user.id)', 'usercount')
            .addSelect('COUNT(post.id)', 'postcount')
            .addSelect(
              'AVG((nlp.sentiment->>\'positive_prob\')::numeric - (nlp.sentiment->>\'negative_prob\')::numeric)',
              'avgsentiment'
            )
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere('post.deleted_at IS NULL')
            .groupBy('COALESCE(NULLIF(post.region_name, \'\'), NULLIF(user.location, \'\'), \'未知\')')
            .orderBy('usercount', 'DESC')
            .limit(20)
            .getRawMany();

          const totalUsers = locationData.reduce(
            (sum, item) => sum + parseInt(item.usercount || '0', 10),
            0
          );

          const result = locationData.map((item: {
            location: string;
            usercount: string;
            postcount: string;
            avgsentiment: string;
          }) => {
            const userCount = parseInt(item.usercount || '0', 10);
            const postCount = parseInt(item.postcount || '0', 10);
            const avgSentiment = parseFloat(item.avgsentiment || '0');

            // 将情感值 [-1, 1] 归一化到 [0, 1]，无数据时返回 0.5（中性）
            const normalizedSentiment =
              avgSentiment !== 0
                ? Math.max(0, Math.min(1, (avgSentiment + 1) / 2))
                : 0.5;

            return {
              region: (item.location || '未知').replace('发布于 ', ''),
              count: userCount,
              percentage:
                totalUsers > 0
                  ? Math.round((userCount / totalUsers) * 10000) / 100
                  : 0,
              posts: postCount,
              sentiment: Math.round(normalizedSentiment * 100) / 100,
            };
          });

          // 返回 GeographicResponse 格式
          return {
            statistics: {
              regionCount: realTotalRegions,
              userCount: realTotalUsers,
              postCount: realTotalPosts,
              avgSentiment: normalizedGlobalSentiment,
            },
            distributions: result,
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getHotEvents(timeRange: TimeRange): Promise<HotEvent[]> {
    return this.basicQueries.getHotEvents(timeRange);
  }

  async getEventById(id: string): Promise<EventWithCategory | null> {
    return this.basicQueries.getEventById(id);
  }

  async getEventCategories(
    timeRange: TimeRange
  ): Promise<EventCategoryStats> {
    return this.basicQueries.getEventCategories(timeRange);
  }

  async getLatestStatistics(eventId: string): Promise<EventStatistics | null> {
    return getLatestStatistics(eventId);
  }

  async getEventStatistics(eventId: string, timeRange: TimeRange): Promise<EventStatistics[]> {
    return getEventStatistics(eventId, timeRange);
  }

  async getAllEventStatistics(eventId: string): Promise<EventStatistics[]> {
    return getAllEventStatistics(eventId);
  }

  async getInfluenceUsers(eventId: string): Promise<InfluenceUser[]> {
    return this.userQueries.getInfluenceUsers(eventId);
  }

  async getEventKeywords(
    eventId: string,
    limit: number = 1000
  ): Promise<Array<{ keyword: string; weight: number; sentiment: string }>> {
    return this.keywordQueries.getEventKeywords(eventId, limit);
  }

  async getSentimentHotness(eventId: string): Promise<EventSentimentHotness[]> {
    return this.sentimentQueries.getSentimentHotness(eventId);
  }

  async getSentimentDistribution(eventId: string): Promise<EventSentimentDistribution> {
    return this.sentimentQueries.getSentimentDistribution(eventId);
  }

  async getSentimentIntensity(eventId: string): Promise<EventSentimentIntensity[]> {
    return this.sentimentQueries.getSentimentIntensity(eventId);
  }

  async getKeywordsTimeSeries(eventId: string, topN: number = 20): Promise<EventKeywordTimeSeries[]> {
    return this.keywordQueries.getKeywordsTimeSeries(eventId, topN);
  }

  async getKeywordsBySentiment(eventId: string): Promise<EventKeywordBySentiment[]> {
    return this.keywordQueries.getKeywordsBySentiment(eventId);
  }

  async getNegativeKeywords(eventId: string, threshold: number = 0.5): Promise<EventNegativeKeywordAlert[]> {
    return this.keywordQueries.getNegativeKeywords(eventId, threshold);
  }

  async getEventTypes(eventId: string): Promise<EventEventTypeDistribution[]> {
    return this.sentimentQueries.getEventTypes(eventId);
  }

  async getEngagementTrend(eventId: string): Promise<EventEngagementTrend[]> {
    return this.engagementQueries.getEngagementTrend(eventId);
  }

  async getAnomalies(eventId: string): Promise<EventAnomaly[]> {
    return this.engagementQueries.getAnomalies(eventId);
  }

  async getPeaks(eventId: string, limit: number = 168): Promise<EventPeak[]> {
    return this.engagementQueries.getPeaks(eventId, limit);
  }

  async getEventUserRelations(eventId: string): Promise<UserRelationNetwork> {
    return this.userQueries.getEventUserRelations(eventId);
  }
}
