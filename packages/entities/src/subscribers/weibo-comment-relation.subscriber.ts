import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { WeiboCommentEntity } from '../weibo-comment.entity';
import { WeiboPostEntity } from '../weibo-post.entity';
import { UserRelationStatisticsHelper } from './user-relation-statistics.helper';
import { UserRelationType } from '../user-relation-statistics.entity';

/**
 * 微博评论关系统计订阅器
 *
 * 存在即合理：
 * - 监听评论插入，自动更新用户关系统计
 * - 使用 reply_to_user_id 字段获取目标用户
 * - 从关联帖子获取 event_id
 */
@EventSubscriber()
export class WeiboCommentRelationSubscriber implements EntitySubscriberInterface<WeiboCommentEntity> {
  listenTo() {
    return WeiboCommentEntity;
  }

  async afterInsert(event: InsertEvent<WeiboCommentEntity>) {
    const comment = event.entity;
    if (!comment?.post_id) return;

    // 获取帖子以获取 event_id
    const post = await event.manager.findOne(WeiboPostEntity, {
      where: { id: comment.post_id },
      select: ['event_id']
    });
    if (!post?.event_id) return;

    const sourceUserId = comment.user_id?.toString();
    const targetUserId = comment.reply_to_user_id?.toString();

    if (!sourceUserId || !targetUserId || sourceUserId === targetUserId) return;

    await UserRelationStatisticsHelper.upsertRelation(
      event.manager,
      sourceUserId,
      targetUserId,
      UserRelationType.COMMENT,
      comment.ingestedAt,
      post.event_id
    );
  }
}
