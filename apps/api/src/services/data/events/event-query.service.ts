import { Injectable, Inject } from '@sker/core';
import {
  useEntityManager,
  EventEntity,
  EventHourlyStatisticsEntity,
  WeiboPostEntity,
  PostNLPResultEntity,
  findHotEvents,
  findLatestEventStatistics,
  getEventCategoryStats,
  getDateRangeByTimeRange,
  HourlyStatisticsHelper,
  findEventList,
} from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../cache.service';
import type {
  TimeRange,
  HotEvent,
  EventListItem,
  EventWithCategory,
  EventStatistics,
  SentimentScore,
  EventCategoryStats,
  InfluenceUser,
  GeographicDistribution,
  GeographicResponse,
  EventSentimentHotness,
  EventSentimentDistribution,
  EventSentimentIntensity,
  EventKeywordTimeSeries,
  EventKeywordBySentiment,
  EventNegativeKeywordAlert,
  EventEventTypeDistribution,
  EventEngagementTrend,
  EventAnomaly,
  EventPeak,
} from './types';
import { TREND_THRESHOLD, INFLUENCE_WEIGHTS } from './constants';
import { UserRelationNetwork } from '@sker/sdk';
import { getStructuredLogger } from '../../../utils/logger';

/**
 * 最大热度计算事件数量限制
 *
 * 当事件数量超过此阈值时，系统会回退到使用数据库的 hotness 字段排序，
 * 避免在内存中计算所有事件的衰减热度导致性能问题。
 *
 * 注意：该值是硬编码的常量。如果需要动态配置，可以考虑：
 * 1. 将其移至环境变量或配置文件
 * 2. 根据系统资源动态调整
 */
const MAX_HOTNESS_CALCULATION_EVENTS = 1000;

@Injectable({ providedIn: 'root' })
export class EventQueryService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

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
          const allStatistics = await this.getStatisticsBatch(paginatedIds, statsTimeRange);

          // 构建返回数据（使用数据库持久化的 hotness 值）
          const data = events.map((event) => {
            const stats = allStatistics.find(s => s.event_id === event.id);
            const displayHotness = parseFloat(event.hotness.toString());
            return this.mapEventToListItem(
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
        const displayHotnessMap = await this.calculateDecayedHotnessForEvents(
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

        // 【修改】第四步：手动分页
        const paginatedIds = sortedEventIds.slice((page - 1) * pageSize, page * pageSize);

        // 【修改】第五步：获取分页后的事件详情
        const events = await this.getEventsByIds(paginatedIds);
        const allStatistics = await this.getStatisticsBatch(paginatedIds, statsTimeRange);

        // 【修改】第六步：构建返回数据（不需要再排序）
        const data = events.map((event) => {
          const stats = allStatistics.find(s => s.event_id === event.id);
          const displayHotness = Math.round((displayHotnessMap.get(event.id) ?? 0) * 100) / 100;
          return this.mapEventToListItem(
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
   * 根据ID数组获取事件详情
   */
  private async getEventsByIds(ids: string[]): Promise<EventWithCategory[]> {
    if (ids.length === 0) return [];

    return await useEntityManager(async (entityManager) => {
      return await entityManager
        .createQueryBuilder(EventEntity, 'event')
        .leftJoinAndSelect('event.category', 'category')
        .where('event.id IN (:...ids)', { ids })
        .getMany();
    });
  }

  async getHotEvents(timeRange: TimeRange): Promise<HotEvent[]> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.HOT_EVENTS, timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await findHotEvents(timeRange);
      },
      CACHE_TTL.SHORT
    );
  }

  async getEventById(id: string): Promise<EventWithCategory | null> {
    return await useEntityManager(async (entityManager) => {
      const event = await entityManager
        .createQueryBuilder('events', 'event')
        .leftJoinAndSelect('event.category', 'category')
        .where('event.id = :id', { id })
        .getOne();

      return event as EventWithCategory | null;
    });
  }

  async getLatestStatistics(
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

  async getEventStatistics(
    eventId: string,
    timeRange: TimeRange
  ): Promise<EventStatistics[]> {
    const stats = await findLatestEventStatistics(eventId, timeRange);
    return stats as EventStatistics[];
  }

  async getAllEventStatistics(eventId: string): Promise<EventStatistics[]> {
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

  async getEventCategories(
    timeRange: TimeRange
  ): Promise<EventCategoryStats> {
    const cacheKey = CacheService.buildKey('event:categories', timeRange);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const stats = await getEventCategoryStats(timeRange);

        return {
          categories: stats.map((s: { name: string }) => s.name),
          counts: stats.map((s: { count: string }) => parseInt(s.count, 10)),
        };
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getInfluenceUsers(eventId: string): Promise<InfluenceUser[]> {
    const cacheKey = CacheService.buildKey('event:influence_users', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const topUsers = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .innerJoin('nlp.post', 'post')
            .innerJoin('post.user', 'user')
            .select('user.id', 'userid')
            .addSelect('user.screen_name', 'name')
            .addSelect('user.followers_count', 'followers')
            .addSelect('COUNT(post.id)', 'postcount')
            .addSelect(
              'SUM(post.attitudes_count + post.comments_count + post.reposts_count)',
              'totalinteractions'
            )
            .addSelect(
              'AVG((nlp.sentiment->>\'positive_prob\')::numeric)',
              'avgsentiment'
            )
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere('post.deleted_at IS NULL')
            .groupBy('user.id, user.screen_name, user.followers_count')
            .orderBy('totalinteractions', 'DESC')
            .limit(10)
            .getRawMany();

          return topUsers.map((user: {
            userid: string;
            name: string;
            followers: string;
            postcount: string;
            totalinteractions: string;
            avgsentiment: string;
          }) => {
            const totalInteractions = parseInt(user.totalinteractions || '0', 10);
            const followers = parseInt(user.followers || '0', 10);
            const postCount = parseInt(user.postcount || '0', 10);
            const avgSentiment = parseFloat(user.avgsentiment || '0.5');

            const influence = Math.min(
              100,
              Math.round(
                totalInteractions * INFLUENCE_WEIGHTS.INTERACTION +
                  (followers / 1000) * INFLUENCE_WEIGHTS.FOLLOWERS +
                  postCount * INFLUENCE_WEIGHTS.POST_COUNT
              )
            );

            return {
              userId: user.userid || '',
              username: user.name || '未知用户',
              influence,
              postCount,
              followers,
              interactionCount: totalInteractions,
              sentimentScore: Math.round(avgSentiment * 100) / 100,
            };
          });
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getEventKeywords(
    eventId: string,
    limit: number = 1000
  ): Promise<Array<{ keyword: string; weight: number; sentiment: string }>> {
    const cacheKey = CacheService.buildKey('event:keywords', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const nlpResults = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .where('nlp.event_id = :eventId', { eventId })
            .getMany();

          const keywordMap = new Map<
            string,
            { totalWeight: number; sentiment: string; count: number }
          >();

          nlpResults.forEach((result) => {
            const keywords = result.keywords || [];
            keywords.forEach((kw) => {
              const existing = keywordMap.get(kw.keyword);
              if (existing) {
                existing.totalWeight += kw.weight;
                existing.count += 1;
              } else {
                keywordMap.set(kw.keyword, {
                  totalWeight: kw.weight,
                  sentiment: kw.sentiment || 'neutral',
                  count: 1,
                });
              }
            });
          });

          return Array.from(keywordMap.entries())
            .map(([keyword, data]) => ({
              keyword,
              weight: Math.round(data.totalWeight * 100) / 100,
              sentiment: data.sentiment,
            }))
            .sort((a, b) => b.weight - a.weight)
            .slice(0, limit);
        });
      },
      CACHE_TTL.MEDIUM
    );
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

  private async getStatisticsBatch(
    eventIds: string[],
    timeRange?: TimeRange
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
  private async calculateDecayedHotnessForEvents(
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

  private mapEventToListItem(
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
      trend: this.calculateTrend(statistics),
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

  private calculateTrend(
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

  // 新增：NLP 深度分析查询方法

  async getSentimentHotness(eventId: string): Promise<EventSentimentHotness[]> {
    const cacheKey = CacheService.buildKey('event:sentiment_hotness', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          // 获取 NLP 结果和帖子互动数据，计算每个帖子的热度
          const results = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .innerJoin('nlp.post', 'post')
            .select('nlp.post_id', 'postId')
            .addSelect(
              '(nlp.sentiment->>\'positive_prob\')::numeric - (nlp.sentiment->>\'negative_prob\')::numeric',
              'sentimentScore'
            )
            .addSelect('COALESCE(post.reposts_count, 0)', 'reposts')
            .addSelect('COALESCE(post.comments_count, 0)', 'comments')
            .addSelect('COALESCE(post.attitudes_count, 0)', 'attitudes')
            .addSelect('nlp.created_at', 'timestamp')
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere('post.deleted_at IS NULL')
            .orderBy('nlp.created_at', 'DESC')
            .limit(500)
            .getRawMany();

          // 计算热度值：转发权重最高，评论次之，点赞最低
          // 使用对数缩放避免极端值，同时保留差异
          return results.map((row: {
            postId: string;
            sentimentScore: string;
            reposts: string;
            comments: string;
            attitudes: string;
            timestamp: Date;
          }) => {
            const reposts = parseFloat(row.reposts || '0');
            const comments = parseFloat(row.comments || '0');
            const attitudes = parseFloat(row.attitudes || '0');

            // 热度计算公式：转发*5 + 评论*2 + 点赞*1
            // 使用 Math.log1p 避免对数计算时的极端值
            const rawHotness = reposts * 5 + comments * 2 + attitudes * 1;

            // 使用对数缩放，加 1 避免log(0)，结果范围约在 0-100 之间
            const hotness = rawHotness > 0
              ? Math.min(100, Math.log10(rawHotness + 1) * 25)
              : 0;

            return {
              postId: row.postId,
              sentimentScore: parseFloat(row.sentimentScore || '0'),
              hotness: Math.round(hotness * 100) / 100,
              timestamp: row.timestamp.toISOString(),
            };
          });
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getSentimentDistribution(eventId: string): Promise<EventSentimentDistribution> {
    const cacheKey = CacheService.buildKey('event:sentiment_distribution', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const results = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .select('nlp.sentiment->>\'overall\'', 'overall')
            .addSelect('COUNT(*)', 'count')
            .where('nlp.event_id = :eventId', { eventId })
            .groupBy('nlp.sentiment->>\'overall\'')
            .getRawMany();

          const distribution = {
            positive: { count: 0, percentage: 0 },
            negative: { count: 0, percentage: 0 },
            neutral: { count: 0, percentage: 0 },
          };

          let total = 0;
          results.forEach((row: { overall: string; count: string }) => {
            const count = parseInt(row.count || '0', 10);
            total += count;
            if (row.overall in distribution) {
              distribution[row.overall as keyof typeof distribution].count = count;
            }
          });

          if (total > 0) {
            distribution.positive.percentage = Math.round((distribution.positive.count / total) * 10000) / 100;
            distribution.negative.percentage = Math.round((distribution.negative.count / total) * 10000) / 100;
            distribution.neutral.percentage = Math.round((distribution.neutral.count / total) * 10000) / 100;
          }

          return distribution;
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getSentimentIntensity(eventId: string): Promise<EventSentimentIntensity[]> {
    return await useEntityManager(async (entityManager) => {
      const stats = await entityManager
        .createQueryBuilder(EventHourlyStatisticsEntity, 'stats')
        .select('stats.sentiment_positive', 'positive')
        .addSelect('stats.sentiment_negative', 'negative')
        .addSelect('stats.sentiment_neutral', 'neutral')
        .where('stats.event_id = :eventId', { eventId })
        .orderBy('stats.year', 'DESC')
        .addOrderBy('stats.month', 'DESC')
        .addOrderBy('stats.day', 'DESC')
        .addOrderBy('stats.hour', 'DESC')
        .limit(168)
        .getRawMany();

      const intensityMap = new Map<number, number>();

      stats.forEach((row: any) => {
        const positive = parseFloat(row.positive || '0');
        const negative = parseFloat(row.negative || '0');
        const neutral = parseFloat(row.neutral || '0');
        const total = positive + negative + neutral;

        if (total > 0) {
          const intensity = Math.abs(positive - negative) / total;
          const bucket = Math.round(intensity * 10) / 10;
          intensityMap.set(bucket, (intensityMap.get(bucket) || 0) + 1);
        }
      });

      return Array.from(intensityMap.entries())
        .map(([intensity, count]) => ({
          intensity,
          count
        }))
        .sort((a, b) => a.intensity - b.intensity);
    });
  }

  async getKeywordsTimeSeries(eventId: string, topN: number = 20): Promise<EventKeywordTimeSeries[]> {
    const cacheKey = CacheService.buildKey('event:keywords_timeseries', eventId, topN.toString());

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const nlpResults = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .where('nlp.event_id = :eventId', { eventId })
            .orderBy('nlp.created_at', 'ASC')
            .getMany();

          const keywordTimeMap = new Map<string, Array<{ timestamp: string; weight: number }>>();

          nlpResults.forEach((result) => {
            const keywords = result.keywords || [];
            const timestamp = result.created_at.toISOString();

            keywords.forEach((kw) => {
              if (!keywordTimeMap.has(kw.keyword)) {
                keywordTimeMap.set(kw.keyword, []);
              }
              keywordTimeMap.get(kw.keyword)!.push({ timestamp, weight: kw.weight });
            });
          });

          const topKeywords = Array.from(keywordTimeMap.entries())
            .map(([keyword, data]) => ({
              keyword,
              totalWeight: data.reduce((sum, d) => sum + d.weight, 0),
            }))
            .sort((a, b) => b.totalWeight - a.totalWeight)
            .slice(0, topN)
            .map((k) => k.keyword);

          return topKeywords.map((keyword) => ({
            keyword,
            timeData: keywordTimeMap.get(keyword)!,
          }));
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getKeywordsBySentiment(eventId: string): Promise<EventKeywordBySentiment[]> {
    const cacheKey = CacheService.buildKey('event:keywords_by_sentiment', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const nlpResults = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .where('nlp.event_id = :eventId', { eventId })
            .getMany();

          const keywordMap = new Map<string, { totalWeight: number; sentiment: string; count: number }>();

          nlpResults.forEach((result) => {
            const keywords = result.keywords || [];
            keywords.forEach((kw) => {
              const existing = keywordMap.get(kw.keyword);
              if (existing) {
                existing.totalWeight += kw.weight;
                existing.count += 1;
              } else {
                keywordMap.set(kw.keyword, {
                  totalWeight: kw.weight,
                  sentiment: kw.sentiment || 'neutral',
                  count: 1,
                });
              }
            });
          });

          return Array.from(keywordMap.entries())
            .map(([keyword, data]) => ({
              keyword,
              weight: Math.round(data.totalWeight * 100) / 100,
              sentiment: data.sentiment as 'positive' | 'negative' | 'neutral',
              count: data.count,
            }))
            .sort((a, b) => b.weight - a.weight);
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getNegativeKeywords(eventId: string, threshold: number = 0.5): Promise<EventNegativeKeywordAlert[]> {
    const cacheKey = CacheService.buildKey('event:negative_keywords', eventId, threshold.toString());

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const keywordsBySentiment = await this.getKeywordsBySentiment(eventId);

        return keywordsBySentiment
          .filter((kw) => kw.sentiment === 'negative' && kw.weight >= threshold)
          .map((kw) => ({
            keyword: kw.keyword,
            weight: kw.weight,
            count: kw.count,
            trend: 'stable' as const,
          }))
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 20);
      },
      CACHE_TTL.SHORT
    );
  }

  async getEventTypes(eventId: string): Promise<EventEventTypeDistribution[]> {
    const cacheKey = CacheService.buildKey('event:event_types', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const results = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .select('nlp.event_type->>\'type\'', 'eventType')
            .addSelect('COUNT(*)', 'count')
            .addSelect('AVG((nlp.event_type->>\'confidence\')::numeric)', 'avgConfidence')
            .addSelect(
              'AVG((nlp.sentiment->>\'positive_prob\')::numeric - (nlp.sentiment->>\'negative_prob\')::numeric)',
              'avgSentiment'
            )
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere("nlp.event_type->>\'type\' IS NOT NULL")
            .andWhere("nlp.event_type->>\'type\' != ''")
            .groupBy('nlp.event_type->>\'type\'')
            .orderBy('count', 'DESC')
            .getRawMany();

          return results.map((row: {
            eventType: string;
            count: string;
            avgConfidence: string;
            avgSentiment: string;
          }) => ({
            eventType: row.eventType || '未知',
            count: parseInt(row.count || '0', 10),
            confidence: Math.round(parseFloat(row.avgConfidence || '0') * 100) / 100,
            avgSentiment: Math.round(parseFloat(row.avgSentiment || '0') * 100) / 100,
          }));
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  // 新增：基于 EventHourlyStatisticsEntity 的互动指标查询

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

  async getEventUserRelations(eventId: string): Promise<UserRelationNetwork> {
    const cacheKey = CacheService.buildKey('event:user-relations', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          // 一次 JOIN 查询获取边和用户信息
          const result = await entityManager.query(
            `
            SELECT
              urs.source_user_id,
              urs.target_user_id,
              urs.like_count,
              urs.comment_count,
              urs.repost_count,
              urs.weight,
              u1.screen_name as src_name,
              u1.followers_count as src_followers,
              u1.statuses_count as src_posts,
              u1.verified as src_verified,
              u1.location as src_location,
              u1.profile_image_url as src_avatar,
              u2.screen_name as tgt_name,
              u2.followers_count as tgt_followers,
              u2.statuses_count as tgt_posts,
              u2.verified as tgt_verified,
              u2.location as tgt_location,
              u2.profile_image_url as tgt_avatar
            FROM (
              SELECT
                source_user_id,
                target_user_id,
                SUM(CASE WHEN relation_type = 'like' THEN weight ELSE 0 END) as like_count,
                SUM(CASE WHEN relation_type = 'comment' THEN weight ELSE 0 END) as comment_count,
                SUM(CASE WHEN relation_type = 'repost' THEN weight ELSE 0 END) as repost_count,
                SUM(weight) as weight
              FROM user_relation_statistics
              WHERE event_id = $1
              GROUP BY source_user_id, target_user_id
            ) urs
            LEFT JOIN weibo_users u1 ON urs.source_user_id::bigint = u1.id
            LEFT JOIN weibo_users u2 ON urs.target_user_id::bigint = u2.id
            ORDER BY urs.weight DESC
          `,
            [eventId]
          );

          if (result.length === 0) {
            return { nodes: [], edges: [], statistics: { totalUsers: 0, totalRelations: 0, avgDegree: 0, density: 0 } };
          }

          // 从查询结果构建用户信息 Map
          const buildUserInfo = (userId: string, prefix: 'src' | 'tgt', row: any) => {
            const name = row[`${prefix}_name`] || `用户_${userId}`;
            const followers = parseInt(row[`${prefix}_followers`]) || 0;
            const posts = parseInt(row[`${prefix}_posts`]) || 0;
            const influence = Math.min(100, Math.floor((Math.log10(followers + 1) * 10 + Math.log10(posts + 1) * 5) * 2));
            const verified = row[`${prefix}_verified`] || false;

            return {
              id: userId,
              name,
              avatar: row[`${prefix}_avatar`],
              followers,
              influence,
              postCount: posts,
              verified,
              userType: verified ? 'official' : 'normal',
              location: row[`${prefix}_location`],
            };
          };

          // 收集所有节点（去重）
          const nodesMap = new Map<string, any>();
          for (const row of result) {
            const sourceId = row.source_user_id;
            const targetId = row.target_user_id;

            if (!nodesMap.has(sourceId)) nodesMap.set(sourceId, buildUserInfo(sourceId, 'src', row));
            if (!nodesMap.has(targetId)) nodesMap.set(targetId, buildUserInfo(targetId, 'tgt', row));
          }

          // 构建边
          const edges = result.map((row: any) => ({
            source: row.source_user_id,
            target: row.target_user_id,
            weight: parseInt(row.weight),
            type: 'comprehensive' as const,
            interactions: {
              likes: row.like_count ? parseInt(row.like_count) : undefined,
              comments: row.comment_count ? parseInt(row.comment_count) : undefined,
              reposts: row.repost_count ? parseInt(row.repost_count) : undefined,
            },
          }));

          const nodes = Array.from(nodesMap.values());
          const totalUsers = nodes.length;
          const totalRelations = edges.length;
          const avgDegree = totalUsers > 0 ? (totalRelations * 2) / totalUsers : 0;
          const maxPossibleEdges = (totalUsers * (totalUsers - 1)) / 2;
          const density = maxPossibleEdges > 0 ? totalRelations / maxPossibleEdges : 0;

          return {
            nodes,
            edges,
            statistics: {
              totalUsers,
              totalRelations,
              avgDegree: Number(avgDegree.toFixed(2)),
              density: Number(density.toFixed(4)),
            },
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }
}
