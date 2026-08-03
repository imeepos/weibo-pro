import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  PostNLPResultEntity,
  useEntityManager,
} from '@sker/entities';

/**
 * 查询特定时间段内的高影响力言论
 */
export const createQueryTopOpinionsByTimeTool = () =>
  tool(
    async ({ eventId, startTime, endTime, limit, minInteractions }) => {
      return useEntityManager(async (m) => {
        const qb = m
          .getRepository(PostNLPResultEntity)
          .createQueryBuilder('nlp')
          .leftJoin('nlp.post', 'post')
          .leftJoin('weibo_users', 'u', 'u.id = post.user_id')
          .select('nlp.*')
          .addSelect('post.*')
          .addSelect('u.id', 'user_id')
          .addSelect('u.screen_name', 'user_screen_name')
          .addSelect('u.verified', 'user_verified')
          .addSelect('u.verified_type', 'user_verified_type')
          .addSelect('u.status_total_counter', 'user_status_total_counter')
          .where('nlp.event_id = :eventId', { eventId });

        if (startTime) {
          qb.andWhere('post.created_at >= :startTime', {
            startTime: new Date(startTime),
          });
        }

        if (endTime) {
          qb.andWhere('post.created_at <= :endTime', {
            endTime: new Date(endTime),
          });
        }

        qb.andWhere(
          '(post.reposts_count + post.comments_count + post.attitudes_count) >= :minInteractions',
          { minInteractions }
        )
          .orderBy(
            '(post.reposts_count + post.comments_count + post.attitudes_count)',
            'DESC'
          )
          .limit(limit);

        const results = await qb.getRawMany();

        return JSON.stringify({
          eventId,
          timeRange: {
            start: startTime || 'beginning',
            end: endTime || 'now',
          },
          postCount: results.length,
          opinions: results.map((r) => ({
            postId: r.post_id,
            text: r.post_text,
            createdAt: r.post_created_at,
            user: {
              userId: r.user_id,
              userName: r.user_screen_name || '未知用户',
              verified: r.user_verified || false,
              verifiedType: r.user_verified_type || 0,
              followersCount: r.user_status_total_counter?.total_cnt || '0',
            },
            interactions: {
              reposts: r.post_reposts_count || 0,
              comments: r.post_comments_count || 0,
              likes: r.post_attitudes_count || 0,
              total:
                (r.post_reposts_count || 0) +
                (r.post_comments_count || 0) +
                (r.post_attitudes_count || 0),
            },
            nlp: {
              sentiment: r.nlp_sentiment?.overall || 'neutral',
              keywords: (r.nlp_keywords || []).slice(0, 5),
              eventType: r.nlp_event_type,
            },
          })),
        });
      });
    },
    {
      name: 'query_top_opinions_by_time',
      description: `查询特定时间段内的高影响力言论。
【核心】精确提取指定时间窗口内最具传播力的言论。
【筛选】支持：
  - 时间范围过滤（开始/结束时间）
  - 最低互动量筛选（过滤低影响力内容）
  - 结果数量限制
【数据】包含：
  - 帖子完整内容和时间
  - 发言者详细信息（认证状态、粉丝数）
  - 互动数据（转发、评论、点赞）
  - NLP分析（情感、关键词）
【用途】定向分析特定时间段的舆论焦点，适合已知时间点的深入分析。`,
      schema: z.object({
        eventId: z.string().describe('事件 ID（必填）'),
        startTime: z
          .string()
          .optional()
          .describe('开始时间，ISO 8601 格式，例如 2024-01-01T00:00:00Z'),
        endTime: z
          .string()
          .optional()
          .describe('结束时间，ISO 8601 格式'),
        limit: z.number().default(20).describe('返回数量限制，默认 20'),
        minInteractions: z
          .number()
          .default(100)
          .describe('最低互动量筛选，默认 100'),
      }),
    }
  );
