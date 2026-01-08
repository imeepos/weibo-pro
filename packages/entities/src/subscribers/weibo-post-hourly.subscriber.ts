import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { WeiboPostEntity } from '../weibo-post.entity';
import { HourlyStatisticsHelper } from './hourly-statistics.helper';

/**
 * 微博帖子小时级统计订阅器
 *
 * 存在即合理：
 * - 监听帖子插入，自动更新小时级统计
 * - 直接获取 event_id，无需联表查询
 */
@EventSubscriber()
export class WeiboPostHourlySubscriber implements EntitySubscriberInterface<WeiboPostEntity> {
  listenTo() {
    return WeiboPostEntity;
  }

  async afterInsert(event: InsertEvent<WeiboPostEntity>) {
    const post = event.entity;
    if (!post?.event_id) return;

    const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(post.ingested_at);

    await HourlyStatisticsHelper.upsertStatistics(
      event.manager,
      post.event_id,
      timeDimensions,
      { post_count: 1 }
    );
  }
}
