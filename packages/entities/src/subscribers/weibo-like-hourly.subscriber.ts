import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { WeiboLikeEntity } from '../weibo-like.entity';
import { WeiboPostEntity } from '../weibo-post.entity';
import { HourlyStatisticsHelper } from './hourly-statistics.helper';

/**
 * 微博点赞小时级统计订阅器
 *
 * 存在即合理：
 * - 监听点赞插入，自动更新小时级统计
 * - 通过 targetWeiboId 关联到帖子，再获取 event_id 和帖子发布时间
 */
@EventSubscriber()
export class WeiboLikeHourlySubscriber implements EntitySubscriberInterface<WeiboLikeEntity> {
  listenTo() {
    return WeiboLikeEntity;
  }

  async afterInsert(event: InsertEvent<WeiboLikeEntity>) {
    const like = event.entity;
    if (!like?.targetWeiboId) return;

    const post = await event.manager.findOne(WeiboPostEntity, {
      where: { id: like.targetWeiboId },
      select: ['event_id', 'created_at']
    });

    if (!post?.event_id || !post?.created_at) return;

    const postTime = new Date(post.created_at);
    const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(postTime);

    await HourlyStatisticsHelper.upsertStatistics(
      event.manager,
      post.event_id,
      timeDimensions,
      { like_count: 1 }
    );
  }
}
