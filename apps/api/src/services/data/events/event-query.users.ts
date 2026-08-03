import { useEntityManager, PostNLPResultEntity } from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../cache.service';
import { INFLUENCE_WEIGHTS } from './constants';
import type { InfluenceUser } from './types';
import type { UserRelationNetwork } from '@sker/sdk';

/**
 * 事件用户相关查询模块
 *
 * 负责事件的用户维度分析查询：
 * - 影响力用户（getInfluenceUsers）
 * - 用户关系网络（getEventUserRelations）
 */
export class EventUserQueries {
  constructor(private readonly cacheService: CacheService) {}

  async getInfluenceUsers(eventId: string): Promise<InfluenceUser[]> {
    const cacheKey = CacheService.buildKey('event:influence_users', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          const topUsers = await entityManager
            .createQueryBuilder(PostNLPResultEntity, 'nlp')
            .innerJoin('nlp.post', 'post')
            .innerJoin('post.user', 'user')
            .select('user.id', 'userid')
            .addSelect('user.screen_name', 'name')
            .addSelect('user.followers_count', 'followers')
            .addSelect('COUNT(post.id)', 'postcount')
            .addSelect(
              'SUM(post.attitudes_count + post.comments_count + post.reposts_count)',
              'totalinteractions'
            )
            .addSelect(
              'AVG((nlp.sentiment->>\'positive_prob\')::numeric)',
              'avgsentiment'
            )
            .where('nlp.event_id = :eventId', { eventId })
            .andWhere('post.deleted_at IS NULL')
            .groupBy('user.id, user.screen_name, user.followers_count')
            .orderBy('totalinteractions', 'DESC')
            .limit(10)
            .getRawMany();

          return topUsers.map((user: {
            userid: string;
            name: string;
            followers: string;
            postcount: string;
            totalinteractions: string;
            avgsentiment: string;
          }) => {
            const totalInteractions = parseInt(user.totalinteractions || '0', 10);
            const followers = parseInt(user.followers || '0', 10);
            const postCount = parseInt(user.postcount || '0', 10);
            const avgSentiment = parseFloat(user.avgsentiment || '0.5');

            const influence = Math.min(
              100,
              Math.round(
                totalInteractions * INFLUENCE_WEIGHTS.INTERACTION +
                  (followers / 1000) * INFLUENCE_WEIGHTS.FOLLOWERS +
                  postCount * INFLUENCE_WEIGHTS.POST_COUNT
              )
            );

            return {
              userId: user.userid || '',
              username: user.name || '未知用户',
              influence,
              postCount,
              followers,
              interactionCount: totalInteractions,
              sentimentScore: Math.round(avgSentiment * 100) / 100,
            };
          });
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  async getEventUserRelations(eventId: string): Promise<UserRelationNetwork> {
    const cacheKey = CacheService.buildKey('event:user-relations', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await useEntityManager(async (entityManager) => {
          // 一次 JOIN 查询获取边和用户信息
          const result = await entityManager.query(
            `
            SELECT
              urs.source_user_id,
              urs.target_user_id,
              urs.like_count,
              urs.comment_count,
              urs.repost_count,
              urs.weight,
              u1.screen_name as src_name,
              u1.followers_count as src_followers,
              u1.statuses_count as src_posts,
              u1.verified as src_verified,
              u1.location as src_location,
              u1.profile_image_url as src_avatar,
              u2.screen_name as tgt_name,
              u2.followers_count as tgt_followers,
              u2.statuses_count as tgt_posts,
              u2.verified as tgt_verified,
              u2.location as tgt_location,
              u2.profile_image_url as tgt_avatar
            FROM (
              SELECT
                source_user_id,
                target_user_id,
                SUM(CASE WHEN relation_type = 'like' THEN weight ELSE 0 END) as like_count,
                SUM(CASE WHEN relation_type = 'comment' THEN weight ELSE 0 END) as comment_count,
                SUM(CASE WHEN relation_type = 'repost' THEN weight ELSE 0 END) as repost_count,
                SUM(weight) as weight
              FROM user_relation_statistics
              WHERE event_id = $1
              GROUP BY source_user_id, target_user_id
            ) urs
            LEFT JOIN weibo_users u1 ON urs.source_user_id::bigint = u1.id
            LEFT JOIN weibo_users u2 ON urs.target_user_id::bigint = u2.id
            ORDER BY urs.weight DESC
          `,
            [eventId]
          );

          if (result.length === 0) {
            return { nodes: [], edges: [], statistics: { totalUsers: 0, totalRelations: 0, avgDegree: 0, density: 0 } };
          }

          // 从查询结果构建用户信息 Map
          const buildUserInfo = (userId: string, prefix: 'src' | 'tgt', row: any) => {
            const name = row[`${prefix}_name`] || `用户_${userId}`;
            const followers = parseInt(row[`${prefix}_followers`]) || 0;
            const posts = parseInt(row[`${prefix}_posts`]) || 0;
            const influence = Math.min(100, Math.floor((Math.log10(followers + 1) * 10 + Math.log10(posts + 1) * 5) * 2));
            const verified = row[`${prefix}_verified`] || false;

            return {
              id: userId,
              name,
              avatar: row[`${prefix}_avatar`],
              followers,
              influence,
              postCount: posts,
              verified,
              userType: verified ? 'official' : 'normal',
              location: row[`${prefix}_location`],
            };
          };

          // 收集所有节点（去重）
          const nodesMap = new Map<string, any>();
          for (const row of result) {
            const sourceId = row.source_user_id;
            const targetId = row.target_user_id;

            if (!nodesMap.has(sourceId)) nodesMap.set(sourceId, buildUserInfo(sourceId, 'src', row));
            if (!nodesMap.has(targetId)) nodesMap.set(targetId, buildUserInfo(targetId, 'tgt', row));
          }

          // 构建边
          const edges = result.map((row: any) => ({
            source: row.source_user_id,
            target: row.target_user_id,
            weight: parseInt(row.weight),
            type: 'comprehensive' as const,
            interactions: {
              likes: row.like_count ? parseInt(row.like_count) : undefined,
              comments: row.comment_count ? parseInt(row.comment_count) : undefined,
              reposts: row.repost_count ? parseInt(row.repost_count) : undefined,
            },
          }));

          const nodes = Array.from(nodesMap.values());
          const totalUsers = nodes.length;
          const totalRelations = edges.length;
          const avgDegree = totalUsers > 0 ? (totalRelations * 2) / totalUsers : 0;
          const maxPossibleEdges = (totalUsers * (totalUsers - 1)) / 2;
          const density = maxPossibleEdges > 0 ? totalRelations / maxPossibleEdges : 0;

          return {
            nodes,
            edges,
            statistics: {
              totalUsers,
              totalRelations,
              avgDegree: Number(avgDegree.toFixed(2)),
              density: Number(density.toFixed(4)),
            },
          };
        });
      },
      CACHE_TTL.MEDIUM
    );
  }
}
