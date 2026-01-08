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

/** 根据帖子作者 ID 查询收到的评论 */
export const findCommentsByPostAuthor = (postAuthorId: number, limit: number = 100) =>
  useEntityManager(async m => {
    return await m
      .createQueryBuilder(WeiboCommentEntity, 'comment')
      .where('comment.post_author_id = :postAuthorId', { postAuthorId })
      .orderBy('comment.like_counts', 'DESC')
      .addOrderBy('comment.created_at', 'DESC')
      .limit(limit)
      .getMany();
  });

/** 根据被回复用户 ID 查询回复评论 */
export const findRepliesToUser = (userId: number, limit: number = 100) =>
  useEntityManager(async m => {
    return await m
      .createQueryBuilder(WeiboCommentEntity, 'comment')
      .where('comment.reply_to_user_id = :userId', { userId })
      .orderBy('comment.like_counts', 'DESC')
      .addOrderBy('comment.created_at', 'DESC')
      .limit(limit)
      .getMany();
  });

/** 查询用户发布的评论 */
export const findCommentsByUser = (userId: number, limit: number = 100) =>
  useEntityManager(async m => {
    return await m
      .createQueryBuilder(WeiboCommentEntity, 'comment')
      .where('comment.user_id = :userId', { userId })
      .orderBy('comment.created_at', 'DESC')
      .limit(limit)
      .getMany();
  });

/** 查询用户间的评论互动 */
export const findUserCommentRelations = (userId: number, limit: number = 100) =>
  useEntityManager(async m => {
    return await m
      .createQueryBuilder(WeiboCommentEntity, 'comment')
      .where('(comment.user_id = :userId OR comment.reply_to_user_id = :userId)', { userId })
      .orderBy('comment.created_at', 'DESC')
      .limit(limit)
      .getMany();
  });

/** 查询两用户之间的评论互动 */
export const findCommentsBetweenUsers = (userA: number, userB: number, limit: number = 50) =>
  useEntityManager(async m => {
    return await m
      .createQueryBuilder(WeiboCommentEntity, 'comment')
      .where('(comment.user_id = :userA AND comment.reply_to_user_id = :userB)', { userA, userB })
      .orWhere('(comment.user_id = :userB AND comment.reply_to_user_id = :userA)', { userA, userB })
      .orderBy('comment.created_at', 'DESC')
      .limit(limit)
      .getMany();
  });
