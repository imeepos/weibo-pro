import { EntityManager } from 'typeorm';
import { EventHourlyStatisticsEntity } from '../event-hourly-statistics.entity';
import { PostNLPResultEntity } from '../post-nlp-result.entity';
import { WeiboPostEntity } from '../weibo-post.entity';

/**
 * 小时级统计工具类
 *
 * 存在即合理：
 * - 提取共享逻辑，避免 4 个 Subscriber 重复代码
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
   * 聚合情感数据
   */
  static async aggregateSentiment(
    manager: EntityManager,
    eventId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ positive: number; negative: number; neutral: number }> {
    const result = await manager
      .createQueryBuilder(PostNLPResultEntity, 'nlp')
      .select('AVG((nlp.sentiment->>\'positive_prob\')::float)', 'positive')
      .addSelect('AVG((nlp.sentiment->>\'negative_prob\')::float)', 'negative')
      .addSelect('AVG((nlp.sentiment->>\'neutral_prob\')::float)', 'neutral')
      .where('nlp.event_id = :eventId', { eventId })
      .andWhere('nlp.created_at >= :startTime', { startTime })
      .andWhere('nlp.created_at < :endTime', { endTime })
      .getRawOne();

    return {
      positive: Number(result?.positive) || 0,
      negative: Number(result?.negative) || 0,
      neutral: Number(result?.neutral) || 0
    };
  }

  /**
   * 聚合用户数（去重）
   */
  static async aggregateUserCount(
    manager: EntityManager,
    eventId: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    const result = await manager
      .createQueryBuilder(WeiboPostEntity, 'post')
      .select('COUNT(DISTINCT post.user_id)', 'user_count')
      .where('post.event_id = :eventId', { eventId })
      .andWhere('post.ingested_at >= :startTime', { startTime })
      .andWhere('post.ingested_at < :endTime', { endTime })
      .getRawOne();

    return Number(result?.user_count) || 0;
  }

  /**
   * 通过 post.id 获取 event_id
   */
  static async getEventIdByPostId(
    manager: EntityManager,
    postId: string
  ): Promise<string | null> {
    const post = await manager.findOne(WeiboPostEntity, {
      where: { id: postId },
      select: ['event_id']
    });
    return post?.event_id || null;
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
   * UPSERT 统计数据
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
    }
  ): Promise<void> {
    const { year, month, day, hour } = timeDimensions;
    const startTime = new Date(year, month - 1, day, hour, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    // 聚合情感和用户数
    const sentiment = await this.aggregateSentiment(manager, eventId, startTime, endTime);
    const userCount = await this.aggregateUserCount(manager, eventId, startTime, endTime);

    // 查询现有统计
    const existing = await manager.findOne(EventHourlyStatisticsEntity, {
      where: { event_id: eventId, ...timeDimensions }
    });

    // 计算新的统计值
    const postCount = (existing?.post_count || 0) + (increments.post_count || 0);
    const commentCount = (existing?.comment_count || 0) + (increments.comment_count || 0);
    const repostCount = (existing?.repost_count || 0) + (increments.repost_count || 0);
    const likeCount = (existing?.like_count || 0) + (increments.like_count || 0);

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
        sentiment_positive: sentiment.positive,
        sentiment_negative: sentiment.negative,
        sentiment_neutral: sentiment.neutral
      })
      .orUpdate(
        ['post_count', 'comment_count', 'repost_count', 'like_count',
          'user_count', 'hotness', 'sentiment_positive', 'sentiment_negative',
          'sentiment_neutral', 'updated_at'],
        ['event_id', 'year', 'month', 'day', 'hour']
      )
      .execute();
  }

  /**
   * UPSERT NLP 情感统计数据
   */
  static async upsertNLPStatistics(
    manager: EntityManager,
    eventId: string,
    timeDimensions: ReturnType<typeof HourlyStatisticsHelper.getTimeDimensions>
  ): Promise<void> {
    const { year, month, day, hour } = timeDimensions;
    const startTime = new Date(year, month - 1, day, hour, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    // 聚合情感
    const sentiment = await this.aggregateSentiment(manager, eventId, startTime, endTime);

    // 查询现有统计
    const existing = await manager.findOne(EventHourlyStatisticsEntity, {
      where: { event_id: eventId, ...timeDimensions }
    });

    // 重新计算热度值（情感变化不影响热度，保持原值）
    const hotness = existing
      ? this.calculateHotness(
          existing.post_count,
          existing.comment_count,
          existing.repost_count,
          existing.like_count
        )
      : 0;

    // UPSERT 仅更新情感字段
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
        sentiment_positive: sentiment.positive,
        sentiment_negative: sentiment.negative,
        sentiment_neutral: sentiment.neutral
      })
      .orUpdate(
        ['sentiment_positive', 'sentiment_negative', 'sentiment_neutral', 'updated_at'],
        ['event_id', 'year', 'month', 'day', 'hour']
      )
      .execute();
  }
}
