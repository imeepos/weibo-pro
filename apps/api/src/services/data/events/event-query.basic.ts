import { useEntityManager, findHotEvents, getEventCategoryStats } from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../cache.service';
import type { HotEvent, TimeRange, EventCategoryStats, EventWithCategory } from './types';

/**
 * 事件基础查询模块
 *
 * 负责事件的基础信息查询：
 * - 热门事件列表（getHotEvents）
 * - 事件详情（getEventById）
 * - 事件分类统计（getEventCategories）
 */
export class EventBasicQueries {
  constructor(private readonly cacheService: CacheService) {}

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
}
