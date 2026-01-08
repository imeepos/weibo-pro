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
    if (!comment?.created_at || !comment?.analysis_extra) return;

    // 从 analysis_extra 解析帖子 mid
    // 格式: author_uid:3340034844|mid:5252774730141085|rid:5226413623670630324
    const midMatch = comment.analysis_extra.match(/\bmid:(\d+)/);
    if (!midMatch) return;

    const postMid = midMatch[1]!;

    const eventId = await HourlyStatisticsHelper.getEventIdByPostMid(
      event.manager,
      postMid
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
