import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { EventEntity, EventStatisticsEntity, useEntityManager } from '@sker/entities';

/**
 * 查询数据库中已记录的事件（包含统计信息）
 */
export const createQueryEventsTool = () =>
  tool(
    async ({ keyword, category, startDate, limit }) => {
      return useEntityManager(async (m) => {
        const qb = m
          .getRepository(EventEntity)
          .createQueryBuilder('event')
          .leftJoinAndSelect(
            EventStatisticsEntity,
            'stats',
            'stats.event_id = event.id'
          )
          .addSelect([
            'stats.post_count',
            'stats.user_count',
            'stats.comment_count',
            'stats.repost_count',
            'stats.like_count',
            'stats.sentiment',
            'stats.hotness',
            'stats.trend_metrics',
          ]);

        if (keyword) {
          qb.andWhere(
            '(event.title LIKE :keyword OR event.description LIKE :keyword)',
            { keyword: `%${keyword}%` }
          );
        }

        if (category) {
          qb.andWhere('event.category = :category', { category });
        }

        if (startDate) {
          qb.andWhere('event.created_at >= :startDate', {
            startDate: new Date(startDate),
          });
        }

        qb.orderBy('event.created_at', 'DESC')
          .addOrderBy('stats.snapshot_at', 'DESC')
          .limit(limit);

        const events = await qb.getRawAndEntities();

        return JSON.stringify(
          events.entities.map((e, idx) => {
            const stats = events.raw[idx];
            return {
              id: e.id,
              title: e.title,
              description: e.description,
              category: e.category,
              createdAt: e.created_at,
              statistics: stats?.stats_post_count
                ? {
                    postCount: stats.stats_post_count,
                    userCount: stats.stats_user_count,
                    commentCount: stats.stats_comment_count,
                    repostCount: stats.stats_repost_count,
                    likeCount: stats.stats_like_count,
                    sentiment: stats.stats_sentiment,
                    hotness: stats.stats_hotness,
                    trendMetrics: stats.stats_trend_metrics,
                  }
                : null,
            };
          })
        );
      });
    },
    {
      name: 'query_events',
      description: `查询数据库中已记录的舆情事件。
事件是对多条帖子的聚合分析结果，包含标题、描述、分类等。
【优化】自动关联事件统计信息，包括帖子数、用户数、互动数、情感分布、热度、趋势等。
可用于了解历史舆情事件，避免重复分析。`,
      schema: z.object({
        keyword: z
          .string()
          .optional()
          .describe('搜索关键词，用于过滤事件标题和描述'),
        category: z
          .string()
          .optional()
          .describe('事件分类，例如：政治、经济、社会、科技'),
        startDate: z
          .string()
          .optional()
          .describe('开始日期，ISO 8601 格式'),
        limit: z.number().default(100).describe('返回数量限制，默认 100'),
      }),
    }
  );
