import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { WeiboRepostEntity } from '../weibo-repost.entity';
import { WeiboPostEntity } from '../weibo-post.entity';
import { UserRelationStatisticsHelper } from './user-relation-statistics.helper';
import { UserRelationType } from '../user-relation-statistics.entity';

/**
 * 微博转发关系统计订阅器
 *
 * 存在即合理：
 * - 监听转发插入，自动更新用户关系统计
 * - 从 retweeted_status JSONB 提取目标用户
 * - 从关联帖子获取 event_id
 */
@EventSubscriber()
export class WeiboRepostRelationSubscriber implements EntitySubscriberInterface<WeiboRepostEntity> {
  listenTo() {
    return WeiboRepostEntity;
  }

  async afterInsert(event: InsertEvent<WeiboRepostEntity>) {
    const repost = event.entity;
    if (!repost?.post_id) return;

    // 获取帖子以获取 event_id
    const post = await event.manager.findOne(WeiboPostEntity, {
      where: { id: repost.post_id },
      select: ['event_id']
    });
    if (!post?.event_id) return;

    const sourceUserId = repost.user_id?.toString();
    const targetUser = (repost.retweeted_status as Record<string, unknown> | null)?.user as Record<string, unknown> | undefined;
    const targetUserId = targetUser?.id?.toString();

    if (!sourceUserId || !targetUserId || sourceUserId === targetUserId) return;

    await UserRelationStatisticsHelper.upsertRelation(
      event.manager,
      sourceUserId,
      targetUserId,
      UserRelationType.REPOST,
      repost.ingested_at,
      post.event_id
    );
  }
}
