import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { WeiboCommentEntity } from '../weibo-comment.entity';
import { HourlyStatisticsHelper } from './hourly-statistics.helper';

/**
 * 微博评论小时级统计订阅器
 *
 * 存在即合理：
 * - 监听评论插入，自动更新小时级统计
 * - 通过 mid 关联到帖子，再获取 event_id
 */
@EventSubscriber()
export class WeiboCommentHourlySubscriber implements EntitySubscriberInterface<WeiboCommentEntity> {
  listenTo() {
    return WeiboCommentEntity;
  }

  async afterInsert(event: InsertEvent<WeiboCommentEntity>) {
    const comment = event.entity;
    if (!comment?.mid || !comment?.created_at) return;

    const eventId = await HourlyStatisticsHelper.getEventIdByPostMid(
      event.manager,
      comment.mid
    );

    if (!eventId) return;

    const commentTime = new Date(comment.created_at);
    const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(commentTime);

    await HourlyStatisticsHelper.upsertStatistics(
      event.manager,
      eventId,
      timeDimensions,
      { comment_count: 1 }
    );
  }
}
