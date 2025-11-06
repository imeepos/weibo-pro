import { useEntityManager } from '../utils';
import { WeiboPostEntity } from '../weibo-post.entity';
import { WeiboUserEntity } from '../weibo-user.entity'
import { TimeRange, getDateRangeByTimeRange } from './event.queries';

/** 获取热门微博 */
export const findHotPosts = (timeRange: TimeRange, limit: number = 50) =>
  useEntityManager(async m => {
    const dateRange = getDateRangeByTimeRange(timeRange);

    return await m
      .createQueryBuilder(WeiboPostEntity, 'post')
      .where('post.created_at >= :startDate', { startDate: dateRange.start })
      .andWhere('post.created_at <= :endDate', { endDate: dateRange.end })
      .orderBy('post.attitudes_count', 'DESC')
      .addOrderBy('post.comments_count', 'DESC')
      .addOrderBy('post.reposts_count', 'DESC')
      .limit(limit)
      .getMany();
  });

/** 统计时间范围内的微博数量 */
export const countPostsByTimeRange = (timeRange: TimeRange) =>
  useEntityManager(async m => {
    const dateRange = getDateRangeByTimeRange(timeRange);

    return await m
      .createQueryBuilder(WeiboPostEntity, 'post')
      .where('post.created_at >= :startDate', { startDate: dateRange.start })
      .andWhere('post.created_at <= :endDate', { endDate: dateRange.end })
      .getCount();
  });

/** 获取时间序列数据 */
export const getTimeSeriesData = (
  timeRange: TimeRange,
  interval: 'hour' | 'day' | 'week' | 'month' = 'day'
) =>
  useEntityManager(async m => {
    const dateRange = getDateRangeByTimeRange(timeRange);

    const result = await m
      .createQueryBuilder(WeiboPostEntity, 'post')
      .select(`DATE_TRUNC('${interval}', post.created_at)`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('post.created_at >= :startDate', { startDate: dateRange.start })
      .andWhere('post.created_at <= :endDate', { endDate: dateRange.end })
      .groupBy(`DATE_TRUNC('${interval}', post.created_at)`)
      .orderBy(`DATE_TRUNC('${interval}', post.created_at)`, 'ASC')
      .getRawMany();

    return result.map(item => ({
      date: item.date,
      count: parseInt(item.count, 10)
    }));
  });

/** 根据关键词搜索微博 */
export const searchPostsByKeyword = (keyword: string, limit: number = 100) =>
  useEntityManager(async m => {
    return await m
      .createQueryBuilder(WeiboPostEntity, 'post')
      .where('post.text_raw ILIKE :keyword', { keyword: `%${keyword}%` })
      .orWhere('post.text ILIKE :keyword', { keyword: `%${keyword}%` })
      .orderBy('post.created_at', 'DESC')
      .limit(limit)
      .getMany();
  });

/** 批量插入或更新微博 */
export const upsertPosts = (posts: Partial<WeiboPostEntity>[]) =>
  useEntityManager(async m => {
    const entities = posts.map(post => m.create(WeiboPostEntity, post as any));
    if (entities.length > 0) {
      await m.upsert(WeiboPostEntity, entities as any[], ['id']);
    }
    return entities.length;
  });

/** 批量插入微博和用户数据 */
export const upsertWeiboData = (statuses: any[]) =>
  useEntityManager(async m => {

    const users = statuses
      .filter(item => item.user)
      .map(item => m.create(WeiboUserEntity, item.user as any));

    if (users.length > 0) {
      await m.upsert(WeiboUserEntity, users as any[], ['id']);
    }

    const posts = statuses.map(item => m.create(WeiboPostEntity, item as any));
    await m.upsert(WeiboPostEntity, posts as any[], ['id']);

    return { userCount: users.length, postCount: posts.length };
  });
