import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { WeiboLikeEntity } from '../weibo-like.entity';
import { HourlyStatisticsHelper } from './hourly-statistics.helper';

/**
 * 微博点赞小时级统计订阅器
 *
 * 存在即合理：
 * - 监听点赞插入，自动更新小时级统计
 * - 通过 targetWeiboId 关联到帖子，再获取 event_id
 */
@EventSubscriber()
export class WeiboLikeHourlySubscriber implements EntitySubscriberInterface<WeiboLikeEntity> {
  listenTo() {
    return WeiboLikeEntity;
  }

  async afterInsert(event: InsertEvent<WeiboLikeEntity>) {
    const like = event.entity;
    if (!like?.targetWeiboId) return;

    const eventId = await HourlyStatisticsHelper.getEventIdByPostId(
      event.manager,
      like.targetWeiboId
    );

    if (!eventId) return;

    const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(like.createdAt);

    await HourlyStatisticsHelper.upsertStatistics(
      event.manager,
      eventId,
      timeDimensions,
      { like_count: 1 }
    );
  }
}
