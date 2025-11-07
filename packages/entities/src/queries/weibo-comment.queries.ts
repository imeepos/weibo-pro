import { useEntityManager } from '../utils';
import { WeiboCommentEntity } from '../weibo-comment.entity';
import { TimeRange, getDateRangeByTimeRange } from './event.queries';

/** 根据微博 ID 获取评论 */
export const findCommentsByPostId = (postId: string, limit: number = 100) =>
  useEntityManager(async m => {
    return await m
      .createQueryBuilder(WeiboCommentEntity, 'comment')
      .where('comment.mid = :postId', { postId })
      .orderBy('comment.like_counts', 'DESC')
      .addOrderBy('comment.created_at', 'DESC')
      .limit(limit)
      .getMany();
  });

/** 统计时间范围内的评论数量 */
export const countCommentsByTimeRange = (timeRange: TimeRange) =>
  useEntityManager(async m => {
    const dateRange = getDateRangeByTimeRange(timeRange);

    return await m
      .createQueryBuilder(WeiboCommentEntity, 'comment')
      .where('comment.created_at >= :startDate', { startDate: dateRange.start })
      .andWhere('comment.created_at <= :endDate', { endDate: dateRange.end })
      .getCount();
  });

/** 获取热门评论 */
export const findHotComments = (limit: number = 50) =>
  useEntityManager(async m => {
    return await m
      .createQueryBuilder(WeiboCommentEntity, 'comment')
      .orderBy('comment.like_counts', 'DESC')
      .limit(limit)
      .getMany();
  });

/** 批量插入或更新评论 */
export const upsertComments = (comments: Partial<WeiboCommentEntity>[]) =>
  useEntityManager(async m => {
    const entities = comments.map(comment => m.create(WeiboCommentEntity, comment as any));
    if (entities.length > 0) {
      await m.upsert(WeiboCommentEntity, entities as any[], ['id']);
    }
    return entities.length;
  });
