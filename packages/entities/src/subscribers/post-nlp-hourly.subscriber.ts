import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { PostNLPResultEntity } from '../post-nlp-result.entity';
import { WeiboPostEntity } from '../weibo-post.entity';
import { HourlyStatisticsHelper } from './hourly-statistics.helper';

/**
 * NLP 结果小时级统计订阅器
 *
 * 存在即合理：
 * - 监听 NLP 结果插入，重新聚合情感评分
 * - 直接获取 event_id，无需联表查询
 * - 情感评分为聚合值，每次插入需重新计算平均值
 */
@EventSubscriber()
export class PostNLPHourlySubscriber implements EntitySubscriberInterface<PostNLPResultEntity> {
  listenTo() {
    return PostNLPResultEntity;
  }

  async afterInsert(event: InsertEvent<PostNLPResultEntity>) {
    const nlpResult = event.entity;
    if (!nlpResult?.event_id || !nlpResult?.post_id) return;

    // 获取帖子发布时间
    const post = await event.manager.findOne(WeiboPostEntity, {
      where: { id: nlpResult.post_id },
      select: ['created_at']
    });
    if (!post?.created_at) return;

    const postTime = new Date(post.created_at);
    const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(postTime);

    await HourlyStatisticsHelper.upsertNLPStatistics(
      event.manager,
      nlpResult.event_id,
      timeDimensions
    );
  }
}
