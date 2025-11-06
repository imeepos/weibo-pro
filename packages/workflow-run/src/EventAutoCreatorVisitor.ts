import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { EventAutoCreatorAst } from '@sker/workflow-ast';
import {
  EventCategoryEntity,
  EventEntity,
  EventStatisticsEntity,
  EventTagEntity,
  EventTagRelationEntity,
  PostNLPResultEntity,
  WeiboPostSnapshotEntity,
  useEntityManager,
} from '@sker/entities';
import type { EntityManager, SentimentScore } from '@sker/entities';

@Injectable()
export class EventAutoCreatorVisitor {
  /**
   * 更新事件统计信息（快照增量法）
   *
   * 核心思路：
   * 1. 保存帖子的互动数据快照（comments/reposts/likes）
   * 2. 计算与上次快照的增量差值
   * 3. 将增量计入当前时间的统计
   *
   * 优势：
   * - 能准确反映"今天新增的互动"而非累积总量
   * - 可检测旧帖子突然爆火（一年前的帖子今天评论激增）
   * - 统计时间线清晰：统计时间 = 数据变化时间
   *
   * 示例：
   * - 2024-01-01：帖子A发布，10条评论 → 快照1
   * - 2025-01-01：帖子A被翻出，1000条评论 → 快照2
   * - 增量 = 990条评论，计入 2025-01-01 的统计 ✓
   */
  private async updateEventStatistics(
    m: EntityManager,
    event: EventEntity,
    post: any,
    sentiment: SentimentScore
  ): Promise<void> {
    const now = new Date();
    const snapshotAt = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      0,
      0,
      0
    );

    // 1. 获取帖子的上一次快照
    const lastSnapshot = await m.findOne(WeiboPostSnapshotEntity, {
      where: { post_id: post.id },
      order: { snapshot_at: 'DESC' },
    });

    // 2. 计算增量
    const deltaComments = post.comments_count - (lastSnapshot?.comments_count || 0);
    const deltaReposts = post.reposts_count - (lastSnapshot?.reposts_count || 0);
    const deltaLikes = post.attitudes_count - (lastSnapshot?.attitudes_count || 0);

    // 3. 保存新快照
    const newSnapshot = m.create(WeiboPostSnapshotEntity, {
      post_id: post.id,
      comments_count: post.comments_count,
      reposts_count: post.reposts_count,
      attitudes_count: post.attitudes_count,
      snapshot_at: now,
    });
    await m.save(WeiboPostSnapshotEntity, newSnapshot);

    // 4. 更新或创建统计记录
    let stats = await m.findOne(EventStatisticsEntity, {
      where: {
        event_id: event.id,
        granularity: 'hourly',
        snapshot_at: snapshotAt,
      },
    });

    let currentHotness: number;

    if (stats) {
      // 已有统计：增量更新
      stats.post_count += 1;
      stats.comment_count += deltaComments;
      stats.repost_count += deltaReposts;
      stats.like_count += deltaLikes;

      // 更新不重复用户数（查询该小时内参与的不重复用户）
      const uniqueUserCount = await m
        .createQueryBuilder(PostNLPResultEntity, 'nlp')
        .innerJoin('nlp.post', 'p')
        .where('nlp.event_id = :eventId', { eventId: event.id })
        .andWhere('nlp.created_at >= :start', { start: snapshotAt })
        .andWhere('nlp.created_at < :end', {
          end: new Date(snapshotAt.getTime() + 3600000),
        })
        .select('COUNT(DISTINCT p.user_id)', 'count')
        .getRawOne();
      stats.user_count = parseInt(uniqueUserCount?.count || '1', 10);

      // 更新平均情感
      const totalPosts = stats.post_count;
      stats.sentiment = {
        positive:
          (stats.sentiment.positive * (totalPosts - 1) + sentiment.positive) /
          totalPosts,
        negative:
          (stats.sentiment.negative * (totalPosts - 1) + sentiment.negative) /
          totalPosts,
        neutral:
          (stats.sentiment.neutral * (totalPosts - 1) + sentiment.neutral) /
          totalPosts,
      };

      // 更新热度
      currentHotness = Number(
        (
          stats.post_count * 0.4 +
          stats.comment_count * 0.3 +
          stats.repost_count * 0.5 +
          stats.like_count * 0.1
        ).toFixed(2)
      );
      stats.hotness = currentHotness;

      await m.save(EventStatisticsEntity, stats);
    } else {
      // 新建统计：使用增量数据
      currentHotness = Number(
        (
          0.4 +
          deltaComments * 0.3 +
          deltaReposts * 0.5 +
          deltaLikes * 0.1
        ).toFixed(2)
      );

      stats = m.create(EventStatisticsEntity, {
        event_id: event.id,
        post_count: 1,
        user_count: 1,
        comment_count: deltaComments,
        repost_count: deltaReposts,
        like_count: deltaLikes,
        sentiment,
        hotness: currentHotness,
        granularity: 'hourly',
        snapshot_at: snapshotAt,
        trend_metrics: null,
      });
      await m.save(EventStatisticsEntity, stats);
    }

    // 查询历史最高热度
    const maxHotnessStats = await m
      .createQueryBuilder(EventStatisticsEntity, 's')
      .where('s.event_id = :eventId', { eventId: event.id })
      .orderBy('s.hotness', 'DESC')
      .limit(1)
      .getOne();

    // 如果当前热度是历史最高，更新事件的 peak_at
    if (maxHotnessStats && maxHotnessStats.hotness <= currentHotness) {
      event.peak_at = snapshotAt;
      await m.save(EventEntity, event);
    }
  }

  @Handler(EventAutoCreatorAst)
  async visit(ast: EventAutoCreatorAst, _ctx: any) {
    ast.state = 'running';

    try {
      await useEntityManager(async (m) => {
        let category = await m.findOne(EventCategoryEntity, {
          where: { name: ast.nlpResult.event.type, status: 'active' },
        });

        if (!category && ast.nlpResult.event.isNewCategory) {
          const maxSort = await m
            .createQueryBuilder(EventCategoryEntity, 'c')
            .select('MAX(c.sort)', 'max')
            .getRawOne();

          category = m.create(EventCategoryEntity, {
            name: ast.nlpResult.event.type,
            description: `由 NLP 自动创建的分类`,
            status: 'active',
            sort: (maxSort?.max || 0) + 1,
          });
          category = await m.save(EventCategoryEntity, category);
          console.log(`[EventAutoCreatorVisitor] 创建新分类: ${category.name}`);
        }

        if (!category) {
          throw new Error(`Category not found: ${ast.nlpResult.event.type}`);
        }

        const sentiment: SentimentScore = {
          positive: ast.nlpResult.sentiment.positive_prob,
          negative: ast.nlpResult.sentiment.negative_prob,
          neutral: ast.nlpResult.sentiment.neutral_prob,
        };

        const eventTitle = ast.nlpResult.eventTitle ||
          ast.post.text_raw.substring(0, 50).trim();

        const eventDescription = ast.nlpResult.eventDescription ||
          ast.post.text_raw.substring(0, 200).trim();

        const existingEvent = await m.findOne(EventEntity, {
          where: {
            title: eventTitle,
            category_id: category.id,
          },
        });

        let event: EventEntity;

        if (existingEvent) {
          const updatedSentiment: SentimentScore = {
            positive:
              (existingEvent.sentiment.positive + sentiment.positive) / 2,
            negative:
              (existingEvent.sentiment.negative + sentiment.negative) / 2,
            neutral: (existingEvent.sentiment.neutral + sentiment.neutral) / 2,
          };

          existingEvent.sentiment = updatedSentiment;
          existingEvent.hotness = Number(existingEvent.hotness) + 1;

          // 如果新的描述更详细，则更新描述
          if (eventDescription.length > (existingEvent.description?.length || 0)) {
            existingEvent.description = eventDescription;
          }

          // peak_at 将在统计信息更新后根据实际热度峰值确定
          // 此处暂不更新，留给统计分析任务处理

          event = await m.save(EventEntity, existingEvent);
        } else {
          const newEvent = m.create(EventEntity, {
            title: eventTitle,
            description: eventDescription,
            category_id: category.id,
            sentiment,
            hotness: 1,
            status: 'active',
            seed_url: `https://weibo.com/${ast.post.user.id}/${ast.post.mblogid}`,
            occurred_at: new Date(ast.post.created_at),
            peak_at: new Date(ast.post.created_at), // 初始峰值时间即发生时间
          });
          event = await m.save(EventEntity, newEvent);
        }

        const nlpResult = m.create(PostNLPResultEntity, {
          post_id: ast.post.id,
          event_id: event.id,
          sentiment: {
            overall: ast.nlpResult.sentiment.overall,
            confidence: ast.nlpResult.sentiment.confidence,
            positive_prob: ast.nlpResult.sentiment.positive_prob,
            negative_prob: ast.nlpResult.sentiment.negative_prob,
            neutral_prob: ast.nlpResult.sentiment.neutral_prob,
          },
          keywords: ast.nlpResult.keywords,
          event_type: ast.nlpResult.event,
        });

        const savedNlpResult = await m.save(PostNLPResultEntity, nlpResult);

        // 处理标签
        if (ast.nlpResult.tags && ast.nlpResult.tags.length > 0) {
          for (const tagData of ast.nlpResult.tags) {
            let tag = await m.findOne(EventTagEntity, {
              where: { name: tagData.name },
            });

            if (!tag && tagData.isNew) {
              tag = m.create(EventTagEntity, {
                name: tagData.name,
                type: tagData.type,
                description: `由 NLP 自动创建的标签`,
                usage_count: 0,
              });
              tag = await m.save(EventTagEntity, tag);
              console.log(`[EventAutoCreatorVisitor] 创建新标签: ${tag.name} (${tag.type})`);
            }

            if (tag) {
              const existingRelation = await m.findOne(EventTagRelationEntity, {
                where: { event_id: event.id, tag_id: tag.id },
              });

              if (!existingRelation) {
                const relation = m.create(EventTagRelationEntity, {
                  event_id: event.id,
                  tag_id: tag.id,
                  relevance_score: 1.0,
                  source: 'nlp',
                });
                await m.save(EventTagRelationEntity, relation);

                tag.usage_count += 1;
                await m.save(EventTagEntity, tag);
              }
            }
          }
        }

        // 更新事件统计信息（hourly 粒度）
        await this.updateEventStatistics(m, event, ast.post, sentiment);

        ast.event = event;
        ast.nlpResultId = savedNlpResult.id;
      });

      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      ast.error = error as Error;
      console.error(`[EventAutoCreatorVisitor] postId: ${ast.post.id}`, error);
    }

    return ast;
  }
}
