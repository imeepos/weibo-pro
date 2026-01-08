import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { WeiboRepostEntity } from '../weibo-repost.entity';
import { HourlyStatisticsHelper } from './hourly-statistics.helper';

/**
 * 微博转发小时级统计订阅器
 *
 * 存在即合理：
 * - 监听转发插入，自动更新小时级统计
 * - 通过 mid 关联到帖子，再获取 event_id
 */
@EventSubscriber()
export class WeiboRepostHourlySubscriber implements EntitySubscriberInterface<WeiboRepostEntity> {
  listenTo() {
    return WeiboRepostEntity;
  }

  async afterInsert(event: InsertEvent<WeiboRepostEntity>) {
    const repost = event.entity;
    if (!repost?.mid || !repost?.created_at) return;

    const eventId = await HourlyStatisticsHelper.getEventIdByPostMid(
      event.manager,
      repost.mid
    );

    if (!eventId) return;

    const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(repost.created_at);

    await HourlyStatisticsHelper.upsertStatistics(
      event.manager,
      eventId,
      timeDimensions,
      { repost_count: 1 }
    );
  }
}
