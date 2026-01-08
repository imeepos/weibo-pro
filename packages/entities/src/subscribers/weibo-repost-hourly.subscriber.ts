import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { WeiboRepostEntity } from '../weibo-repost.entity';
import { HourlyStatisticsHelper } from './hourly-statistics.helper';

/**
 * 微博转发小时级统计订阅器
 *
 * 存在即合理：
 * - 监听转发插入，自动更新小时级统计
 * - 从 analysis_extra 解析帖子 mid，再获取 event_id
 */
@EventSubscriber()
export class WeiboRepostHourlySubscriber implements EntitySubscriberInterface<WeiboRepostEntity> {
  listenTo() {
    return WeiboRepostEntity;
  }

  async afterInsert(event: InsertEvent<WeiboRepostEntity>) {
    const repost = event.entity;
    if (!repost?.created_at || !repost?.analysis_extra) return;

    // 从 analysis_extra 解析帖子 mid
    // 格式: author_uid:3340034844|mid:5252774730141085|rid:5226413623670630324
    const midMatch = repost.analysis_extra.match(/\bmid:(\d+)/);
    if (!midMatch) return;

    const postMid = midMatch[1]!;

    const eventId = await HourlyStatisticsHelper.getEventIdByPostMid(
      event.manager,
      postMid
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
