import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  WeiboPostEntity,
  PostNLPResultEntity,
  useEntityManager,
} from '@sker/entities';

/**
 * 查询数据库中已采集的微博帖子（包含 NLP 分析结果）
 */
export const createQueryPostsTool = () =>
  tool(
    async ({ keyword, startDate, endDate, limit, orderBy }) => {
      return useEntityManager(async (m) => {
        const qb = m
          .getRepository(WeiboPostEntity)
          .createQueryBuilder('post')
          .leftJoinAndSelect(
            PostNLPResultEntity,
            'nlp',
            'nlp.post_id = post.id'
          );

        if (keyword) {
          qb.andWhere('post.text LIKE :keyword', {
            keyword: `%${keyword}%`,
          });
        }

        if (startDate) {
          qb.andWhere('post.created_at >= :startDate', {
            startDate: new Date(startDate),
          });
        }

        if (endDate) {
          qb.andWhere('post.created_at <= :endDate', {
            endDate: new Date(endDate),
          });
        }

        if (orderBy === 'interactions') {
          qb.orderBy(
            '(post.reposts_count + post.comments_count + post.attitudes_count)',
            'DESC'
          );
        } else if (orderBy === 'time_asc') {
          qb.orderBy('post.created_at', 'ASC');
        } else {
          qb.orderBy('post.created_at', 'DESC');
        }

        qb.limit(limit);

        const posts = await qb.getRawAndEntities();

        return JSON.stringify(
          posts.entities.map((p, idx) => {
            const nlpResult = posts.raw[idx];
            return {
              id: p.id,
              text: p.text,
              createdAt: p.created_at,
              userId: p.user?.id,
              userName: p.user?.screen_name,
              interactions: {
                reposts: p.reposts_count,
                comments: p.comments_count,
                likes: p.attitudes_count,
                total: p.reposts_count + p.comments_count + p.attitudes_count,
              },
              nlp: nlpResult?.nlp_sentiment
                ? {
                    sentiment: nlpResult.nlp_sentiment,
                    keywords: nlpResult.nlp_keywords,
                    eventType: nlpResult.nlp_event_type,
                  }
                : null,
            };
          })
        );
      });
    },
    {
      name: 'query_posts',
      description: `查询数据库中已采集的微博帖子。
【重要】此工具仅查询已有数据，不进行实时采集。
【优化】自动关联 NLP 分析结果，如果帖子已分析过，直接返回情感、关键词等信息。
【排序】支持按时间或互动量排序，便于找到热门内容。
返回帖子列表，每个帖子包含：id、文本内容、发布时间、用户信息、互动数据、NLP分析结果（如有）。`,
      schema: z.object({
        keyword: z
          .string()
          .optional()
          .describe('搜索关键词，用于过滤帖子文本内容'),
        startDate: z
          .string()
          .optional()
          .describe('开始日期，ISO 8601 格式，例如 2024-01-01'),
        endDate: z
          .string()
          .optional()
          .describe('结束日期，ISO 8601 格式，例如 2024-12-31'),
        orderBy: z
          .enum(['time_desc', 'time_asc', 'interactions'])
          .default('time_desc')
          .describe(
            '排序方式：time_desc=时间降序（默认）, time_asc=时间升序, interactions=互动量降序'
          ),
        limit: z.number().default(100).describe('返回数量限制，默认 100'),
      }),
    }
  );

/**
 * 查询属于指定事件的所有帖子（按时间或互动量排序）
 */
export const createQueryPostsByEventTool = () =>
  tool(
    async ({ eventId, orderBy, limit }) => {
      return useEntityManager(async (m) => {
        const qb = m
          .getRepository(PostNLPResultEntity)
          .createQueryBuilder('nlp')
          .leftJoinAndSelect('nlp.post', 'post')
          .where('nlp.event_id = :eventId', { eventId });

        if (orderBy === 'time') {
          qb.orderBy('nlp.created_at', 'ASC');
        } else if (orderBy === 'interactions') {
          qb.orderBy(
            '(post.reposts_count + post.comments_count + post.attitudes_count)',
            'DESC'
          );
        } else {
          qb.orderBy('nlp.created_at', 'DESC');
        }

        qb.limit(limit);

        const results = await qb.getMany();

        return JSON.stringify(
          results.map((r) => ({
            id: r.post.id,
            text: r.post.text,
            createdAt: r.post.created_at,
            userId: r.post.user?.id,
            userName: r.post.user?.screen_name,
            interactions: {
              reposts: r.post.reposts_count,
              comments: r.post.comments_count,
              likes: r.post.attitudes_count,
              total:
                r.post.reposts_count +
                r.post.comments_count +
                r.post.attitudes_count,
            },
            nlp: {
              sentiment: r.sentiment,
              keywords: r.keywords,
              eventType: r.event_type,
            },
          }))
        );
      });
    },
    {
      name: 'query_posts_by_event',
      description: `查询属于指定事件的所有帖子。
【核心】通过 event_id 直接获取事件相关的所有帖子，是分析事件来龙去脉的关键工具。
【排序】支持按时间顺序（看事件发展）或按互动量（看热门内容）排序。
【数据】每个帖子包含完整的 NLP 分析结果和互动数据。
用途：分析事件演化过程、识别关键内容、找到代表性帖子。`,
      schema: z.object({
        eventId: z.string().describe('事件 ID（必填）'),
        orderBy: z
          .enum(['time', 'interactions', 'latest'])
          .default('time')
          .describe(
            '排序方式：time=时间升序（事件发展）, interactions=互动量降序（热门内容）, latest=时间降序（最新）'
          ),
        limit: z.number().default(100).describe('返回数量限制，默认 100'),
      }),
    }
  );
