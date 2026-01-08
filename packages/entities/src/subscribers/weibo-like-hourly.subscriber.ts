import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { WeiboLikeEntity } from '../weibo-like.entity';
import { WeiboPostEntity } from '../weibo-post.entity';
import { HourlyStatisticsHelper } from './hourly-statistics.helper';

/**
 * 微博点赞小时级统计订阅器
 *
 * 存在即合理：
 * - 监听点赞插入，自动更新小时级统计
 * - 使用点赞入库时间作为时间维度（统计某小时内的点赞数）
 */
@EventSubscriber()
export class WeiboLikeHourlySubscriber implements EntitySubscriberInterface<WeiboLikeEntity> {
  listenTo() {
    return WeiboLikeEntity;
  }

  async afterInsert(event: InsertEvent<WeiboLikeEntity>) {
    const like = event.entity;
    if (!like?.targetWeiboId || !like?.createdAt) return;

    const post = await event.manager.findOne(WeiboPostEntity, {
      where: { id: like.targetWeiboId },
      select: ['event_id']
    });

    if (!post?.event_id) return;

    const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(like.createdAt);

    await HourlyStatisticsHelper.upsertStatistics(
      event.manager,
      post.event_id,
      timeDimensions,
      { like_count: 1 }
    );
  }
}
