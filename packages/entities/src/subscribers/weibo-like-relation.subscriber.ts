import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { WeiboLikeEntity } from '../weibo-like.entity';
import { WeiboPostEntity } from '../weibo-post.entity';
import { UserRelationStatisticsHelper } from './user-relation-statistics.helper';
import { UserRelationType } from '../user-relation-statistics.entity';

/**
 * 微博点赞关系统计订阅器
 *
 * 存在即合理：
 * - 监听点赞插入，自动更新用户关系统计
 * - 使用 target_user_weibo_id 字段获取目标用户
 * - 从关联帖子获取 event_id
 */
@EventSubscriber()
export class WeiboLikeRelationSubscriber implements EntitySubscriberInterface<WeiboLikeEntity> {
  listenTo() {
    return WeiboLikeEntity;
  }

  async afterInsert(event: InsertEvent<WeiboLikeEntity>) {
    const like = event.entity;
    if (!like?.targetWeiboId) return;

    // 获取帖子以获取 event_id
    const post = await event.manager.findOne(WeiboPostEntity, {
      where: { id: like.targetWeiboId },
      select: ['event_id']
    });
    if (!post?.event_id) return;

    if (like.userWeiboId === like.targetUserWeiboId) return;

    await UserRelationStatisticsHelper.upsertRelation(
      event.manager,
      like.userWeiboId,
      like.targetUserWeiboId,
      UserRelationType.LIKE,
      like.createdAt,
      post.event_id
    );
  }
}
