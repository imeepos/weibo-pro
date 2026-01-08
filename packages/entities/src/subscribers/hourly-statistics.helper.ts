import { EntityManager } from 'typeorm';
import { EventHourlyStatisticsEntity } from '../event-hourly-statistics.entity';
import { PostNLPResultEntity } from '../post-nlp-result.entity';
import { WeiboPostEntity } from '../weibo-post.entity';

/**
 * 小时级统计工具类
 *
 * 存在即合理：
 * - 提取共享逻辑，避免多个 Subscriber 重复代码
 * - 每个 Subscriber 关注自己的实体监听逻辑
 */
export class HourlyStatisticsHelper {
  /**
   * 获取时间维度
   */
  static getTimeDimensions(date: Date) {
    const d = new Date(date);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours()
    };
  }

  /**
   * 计算热度值
   */
  static calculateHotness(
    postCount: number,
    commentCount: number,
    repostCount: number,
    likeCount: number
  ): number {
    return postCount * 1 + commentCount * 2 + repostCount * 3 + likeCount * 0.5;
  }

  /**
   * 通过 post.mid 获取 event_id
   */
  static async getEventIdByPostMid(
    manager: EntityManager,
    mid: string
  ): Promise<string | null> {
    const post = await manager.findOne(WeiboPostEntity, {
      where: { mid },
      select: ['event_id']
    });
    return post?.event_id || null;
  }

  /**
   * UPSERT 统计数据（纯增量）
   *
   * user_count 为用户参与度累计：帖子、评论、转发、点赞各 +1
   */
  static async upsertStatistics(
    manager: EntityManager,
    eventId: string,
    timeDimensions: ReturnType<typeof HourlyStatisticsHelper.getTimeDimensions>,
    increments: {
      post_count?: number;
      comment_count?: number;
      repost_count?: number;
      like_count?: number;
      user_count?: number;
    }
  ): Promise<void> {
    // 查询现有统计
    const existing = await manager.findOne(EventHourlyStatisticsEntity, {
      where: { event_id: eventId, ...timeDimensions }
    });

    // 计算新的统计值
    const postCount = (existing?.post_count || 0) + (increments.post_count || 0);
    const commentCount = (existing?.comment_count || 0) + (increments.comment_count || 0);
    const repostCount = (existing?.repost_count || 0) + (increments.repost_count || 0);
    const likeCount = (existing?.like_count || 0) + (increments.like_count || 0);
    const userCount = (existing?.user_count || 0) + (increments.user_count || 0);

    const hotness = this.calculateHotness(postCount, commentCount, repostCount, likeCount);

    // UPSERT
    await manager
      .createQueryBuilder()
      .insert()
      .into(EventHourlyStatisticsEntity)
      .values({
        event_id: eventId,
        ...timeDimensions,
        post_count: postCount,
        comment_count: commentCount,
        repost_count: repostCount,
        like_count: likeCount,
        user_count: userCount,
        hotness,
        nlp_count: existing?.nlp_count || 0,
        sentiment_positive: existing?.sentiment_positive || 0,
        sentiment_negative: existing?.sentiment_negative || 0,
        sentiment_neutral: existing?.sentiment_neutral || 1
      })
      .orUpdate(
        ['post_count', 'comment_count', 'repost_count', 'like_count',
          'user_count', 'hotness', 'updated_at'],
        ['event_id', 'year', 'month', 'day', 'hour']
      )
      .execute();
  }

  /**
   * UPSERT NLP 情感统计数据（增量计算）
   *
   * 新平均值 = (旧平均值 × 旧数量 + 新值) / (旧数量 + 1)
   */
  static async upsertNLPStatisticsIncremental(
    manager: EntityManager,
    eventId: string,
    timeDimensions: ReturnType<typeof HourlyStatisticsHelper.getTimeDimensions>,
    newSentiment: PostNLPResultEntity['sentiment']
  ): Promise<void> {
    // 查询现有统计
    const existing = await manager.findOne(EventHourlyStatisticsEntity, {
      where: { event_id: eventId, ...timeDimensions }
    });

    const currentNlpCount = existing?.nlp_count || 0;
    const newNlpCount = currentNlpCount + 1;

    let positive = newSentiment.positive_prob;
    let negative = newSentiment.negative_prob;
    let neutral = newSentiment.neutral_prob;

    if (currentNlpCount > 0 && existing) {
      // 新平均值 = (旧平均值 × 旧数量 + 新值) / (旧数量 + 1)
      positive = (existing.sentiment_positive * currentNlpCount + positive) / newNlpCount;
      negative = (existing.sentiment_negative * currentNlpCount + negative) / newNlpCount;
      neutral = (existing.sentiment_neutral * currentNlpCount + neutral) / newNlpCount;
    }

    const hotness = existing
      ? this.calculateHotness(
          existing.post_count,
          existing.comment_count,
          existing.repost_count,
          existing.like_count
        )
      : 0;

    // UPSERT 更新情感字段和 nlp_count
    await manager
      .createQueryBuilder()
      .insert()
      .into(EventHourlyStatisticsEntity)
      .values({
        event_id: eventId,
        ...timeDimensions,
        post_count: existing?.post_count || 0,
        comment_count: existing?.comment_count || 0,
        repost_count: existing?.repost_count || 0,
        like_count: existing?.like_count || 0,
        user_count: existing?.user_count || 0,
        hotness,
        nlp_count: newNlpCount,
        sentiment_positive: positive,
        sentiment_negative: negative,
        sentiment_neutral: neutral
      })
      .orUpdate(
        ['nlp_count', 'sentiment_positive', 'sentiment_negative', 'sentiment_neutral', 'updated_at'],
        ['event_id', 'year', 'month', 'day', 'hour']
      )
      .execute();
  }
}
