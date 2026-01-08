import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  PostNLPResultEntity,
  useEntityManager,
} from '@sker/entities';

/**
 * 分析事件中的关键影响力人物
 */
export const createAnalyzeEventInfluencersTool = () =>
  tool(
    async ({ eventId, limit, minPosts }) => {
      return useEntityManager(async (m) => {
        const results = await m
          .getRepository(PostNLPResultEntity)
          .createQueryBuilder('nlp')
          .leftJoin('nlp.post', 'post')
          .leftJoin('weibo_users', 'u', 'u.id = post.user_id')
          .select('nlp.*')
          .addSelect('post.*')
          .addSelect('u.screen_name', 'user_screen_name')
          .addSelect('u.verified', 'user_verified')
          .addSelect('u.verified_type', 'user_verified_type')
          .addSelect('u.status_total_counter', 'user_status_total_counter')
          .where('nlp.event_id = :eventId', { eventId })
          .getRawMany();

        if (results.length === 0) {
          return JSON.stringify({
            eventId,
            influencers: [],
            message: '该事件暂无相关帖子数据',
          });
        }

        const userMap = new Map<
          string,
          {
            userId: string;
            userName: string;
            verified: boolean;
            verifiedType: number;
            followersCount: number;
            postCount: number;
            totalInteractions: number;
            totalReposts: number;
            totalComments: number;
            totalLikes: number;
            avgInteractions: number;
            posts: Array<{
              postId: string;
              text: string;
              createdAt: string;
              interactions: number;
              sentiment: string;
            }>;
          }
        >();

        results.forEach((r) => {
          const userId = String(r.post_user_id);
          const interactions =
            (r.post_reposts_count || 0) + (r.post_comments_count || 0) + (r.post_attitudes_count || 0);

          if (userMap.has(userId)) {
            const user = userMap.get(userId)!;
            user.postCount++;
            user.totalInteractions += interactions;
            user.totalReposts += r.post_reposts_count || 0;
            user.totalComments += r.post_comments_count || 0;
            user.totalLikes += r.post_attitudes_count || 0;
            user.posts.push({
              postId: r.post_id,
              text: r.post_text,
              createdAt: r.post_created_at,
              interactions,
              sentiment: r.nlp_sentiment?.overall || 'neutral',
            });
          } else {
            userMap.set(userId, {
              userId,
              userName: r.user_screen_name || '未知用户',
              verified: r.user_verified || false,
              verifiedType: r.user_verified_type || 0,
              followersCount: r.user_status_total_counter?.total_cnt
                ? parseInt(r.user_status_total_counter.total_cnt)
                : 0,
              postCount: 1,
              totalInteractions: interactions,
              totalReposts: r.post_reposts_count || 0,
              totalComments: r.post_comments_count || 0,
              totalLikes: r.post_attitudes_count || 0,
              avgInteractions: 0,
              posts: [
                {
                  postId: r.post_id,
                  text: r.post_text,
                  createdAt: r.post_created_at,
                  interactions,
                  sentiment: r.nlp_sentiment?.overall || 'neutral',
                },
              ],
            });
          }
        });

        const influencers = Array.from(userMap.values())
          .filter((u) => u.postCount >= minPosts)
          .map((u) => {
            u.avgInteractions = u.totalInteractions / u.postCount;
            return u;
          })
          .sort((a, b) => {
            const scoreA = a.avgInteractions * 0.6 + a.followersCount * 0.0001 + a.postCount * 10;
            const scoreB = b.avgInteractions * 0.6 + b.followersCount * 0.0001 + b.postCount * 10;
            return scoreB - scoreA;
          })
          .slice(0, limit)
          .map((u) => ({
            userId: u.userId,
            userName: u.userName,
            verified: u.verified,
            verifiedType: u.verifiedType,
            followersCount: u.followersCount,
            influence: {
              postCount: u.postCount,
              totalInteractions: u.totalInteractions,
              avgInteractions: Math.round(u.avgInteractions),
              repostsReceived: u.totalReposts,
              commentsReceived: u.totalComments,
              likesReceived: u.totalLikes,
            },
            topPosts: u.posts
              .sort((a, b) => b.interactions - a.interactions)
              .slice(0, 3),
          }));

        return JSON.stringify({
          eventId,
          totalUsers: userMap.size,
          influencerCount: influencers.length,
          influencers,
        });
      });
    },
    {
      name: 'analyze_event_influencers',
      description: `分析事件中的关键影响力人物（KOL）。
【核心】识别事件中最有影响力的用户，基于多维度评分：
  - 平均互动量（权重60%）：衡量内容传播力
  - 粉丝数量（权重微调）：衡量账号影响力
  - 发帖数量（活跃度加分）：衡量参与度
【数据】返回每个影响力人物的：
  - 基础信息（用户名、认证状态、粉丝数）
  - 影响力指标（发帖数、总互动、平均互动）
  - Top 3 热门帖子（按互动量排序）
【用途】快速定位事件中的意见领袖，找到最有传播力的声音。`,
      schema: z.object({
        eventId: z.string().describe('事件 ID（必填）'),
        limit: z.number().default(20).describe('返回影响力人物数量，默认 20'),
        minPosts: z
          .number()
          .default(2)
          .describe('最少发帖数筛选，避免偶然参与者，默认 2'),
      }),
    }
  );

/**
 * 查询指定用户在事件中的所有言论
 */
export const createQueryUserPostsInEventTool = () =>
  tool(
    async ({ eventId, userId, orderBy }) => {
      return useEntityManager(async (m) => {
        const qb = m
          .getRepository(PostNLPResultEntity)
          .createQueryBuilder('nlp')
          .leftJoin('nlp.post', 'post')
          .leftJoin('weibo_users', 'u', 'u.id = post.user_id')
          .select('nlp.*')
          .addSelect('post.*')
          .addSelect('u.screen_name', 'user_screen_name')
          .addSelect('u.verified', 'user_verified')
          .addSelect('u.status_total_counter', 'user_status_total_counter')
          .where('nlp.event_id = :eventId', { eventId })
          .andWhere('post.user_id = :userId', {
            userId: String(userId),
          });

        if (orderBy === 'time') {
          qb.orderBy('post.created_at', 'ASC');
        } else if (orderBy === 'interactions') {
          qb.orderBy(
            '(post.reposts_count + post.comments_count + post.attitudes_count)',
            'DESC'
          );
        } else {
          qb.orderBy('post.created_at', 'DESC');
        }

        const results = await qb.getRawMany();

        if (results.length === 0) {
          return JSON.stringify({
            eventId,
            userId,
            posts: [],
            message: '该用户在此事件中暂无发言',
          });
        }

        const userInfo = {
          screen_name: results[0]!.user_screen_name,
          verified: results[0]!.user_verified,
          status_total_counter: results[0]!.user_status_total_counter,
        };

        return JSON.stringify({
          eventId,
          userId,
          userName: userInfo.screen_name,
          verified: userInfo.verified,
          followersCount: userInfo.status_total_counter?.total_cnt || '0',
          postCount: results.length,
          posts: results.map((r) => ({
            postId: r.post_id,
            text: r.post_text,
            createdAt: r.post_created_at,
            interactions: {
              reposts: r.post_reposts_count,
              comments: r.post_comments_count,
              likes: r.post_attitudes_count,
              total:
                r.post_reposts_count +
                r.post_comments_count +
                r.post_attitudes_count,
            },
            nlp: {
              sentiment: r.nlp_sentiment?.overall || r.sentiment?.overall,
              keywords: r.nlp_keywords || r.keywords,
              eventType: r.nlp_event_type || r.event_type,
            },
          })),
        });
      });
    },
    {
      name: 'query_user_posts_in_event',
      description: `查询指定用户在某事件中的所有言论。
【核心】获取特定影响力人物在事件中的完整发言记录。
【排序】支持按时间（观察立场变化）或按互动量（找代表性言论）排序。
【数据】包含用户基础信息、发帖数量、每条帖子的完整数据和NLP分析。
【用途】深入分析关键人物的观点、立场演变、影响力来源。
通常配合 analyze_event_influencers 使用：先识别影响力人物，再查询其言论。`,
      schema: z.object({
        eventId: z.string().describe('事件 ID（必填）'),
        userId: z.string().describe('用户 ID（必填）'),
        orderBy: z
          .enum(['time', 'interactions', 'latest'])
          .default('interactions')
          .describe(
            '排序方式：time=时间升序（观察演变）, interactions=互动量降序（代表性言论）, latest=最新'
          ),
      }),
    }
  );
