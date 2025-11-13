import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';
import { getTimeRangeBoundaries } from './time-range.utils';
import type { TimeRange } from './types';
import type {
  UserRelationNetwork,
  UserRelationNode,
  UserRelationEdge,
  UserRelationType,
  UserRelationQueryParams,
} from '@sker/sdk';

@Injectable({ providedIn: 'root' })
export class UserRelationService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getNetwork(params: UserRelationQueryParams = {}): Promise<UserRelationNetwork> {
    const {
      type = 'comprehensive',
      timeRange = '7d',
      minWeight = 1,
      limit = 100,
    } = params;

    const cacheKey = CacheService.buildKey(
      CACHE_KEYS.USER_RELATIONS,
      type,
      timeRange,
      minWeight.toString(),
      limit.toString()
    );

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchNetwork(type, timeRange, minWeight, limit),
      CACHE_TTL.LONG
    );
  }

  private async fetchNetwork(
    type: UserRelationType,
    timeRange: TimeRange,
    minWeight: number,
    limit: number
  ): Promise<UserRelationNetwork> {
    switch (type) {
      case 'like':
        return this.buildLikeNetwork(timeRange, minWeight, limit);
      case 'comment':
        return this.buildCommentNetwork(timeRange, minWeight, limit);
      case 'repost':
        return this.buildRepostNetwork(timeRange, minWeight, limit);
      case 'comprehensive':
        return this.buildComprehensiveNetwork(timeRange, minWeight, limit);
      default:
        return this.buildComprehensiveNetwork(timeRange, minWeight, limit);
    }
  }

  private async buildLikeNetwork(
    timeRange: TimeRange,
    minWeight: number,
    limit: number
  ): Promise<UserRelationNetwork> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      const edgesData = await manager.query(
        `
        SELECT
          l.user_weibo_id as source_user_id,
          p.user->>'id' as target_user_id,
          COUNT(*) as weight
        FROM weibo_likes l
        JOIN weibo_posts p ON l.target_weibo_id = p.id
        WHERE l.created_at >= $1
          AND l.created_at <= $2
          AND l.user_weibo_id != p.user->>'id'
        GROUP BY l.user_weibo_id, p.user->>'id'
        HAVING COUNT(*) >= $3
        ORDER BY COUNT(*) DESC
        LIMIT $4
      `,
        [start, end, minWeight, limit]
      );

      return this.buildNetworkFromEdges(edgesData, 'like', manager);
    });
  }

  private async buildCommentNetwork(
    timeRange: TimeRange,
    minWeight: number,
    limit: number
  ): Promise<UserRelationNetwork> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      const edgesData = await manager.query(
        `
        SELECT
          c.user->>'id' as source_user_id,
          p.user->>'id' as target_user_id,
          COUNT(*) as weight
        FROM weibo_comments c
        JOIN weibo_posts p ON c.rootid = p.id
        WHERE c.ingestedAt >= $1
          AND c.ingestedAt <= $2
          AND c.user->>'id' IS NOT NULL
          AND p.user->>'id' IS NOT NULL
          AND c.user->>'id' != p.user->>'id'
        GROUP BY c.user->>'id', p.user->>'id'
        HAVING COUNT(*) >= $3
        ORDER BY COUNT(*) DESC
        LIMIT $4
      `,
        [start, end, minWeight, limit]
      );

      return this.buildNetworkFromEdges(edgesData, 'comment', manager);
    });
  }

  private async buildRepostNetwork(
    timeRange: TimeRange,
    minWeight: number,
    limit: number
  ): Promise<UserRelationNetwork> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      const edgesData = await manager.query(
        `
        SELECT
          r.user->>'id' as source_user_id,
          r.retweeted_status->'user'->>'id' as target_user_id,
          COUNT(*) as weight
        FROM weibo_reposts r
        WHERE r.ingested_at >= $1
          AND r.ingested_at <= $2
          AND r.retweeted_status IS NOT NULL
          AND r.user->>'id' IS NOT NULL
          AND r.retweeted_status->'user'->>'id' IS NOT NULL
          AND r.user->>'id' != r.retweeted_status->'user'->>'id'
        GROUP BY r.user->>'id', r.retweeted_status->'user'->>'id'
        HAVING COUNT(*) >= $3
        ORDER BY COUNT(*) DESC
        LIMIT $4
      `,
        [start, end, minWeight, limit]
      );

      return this.buildNetworkFromEdges(edgesData, 'repost', manager);
    });
  }

  private async buildComprehensiveNetwork(
    timeRange: TimeRange,
    minWeight: number,
    limit: number
  ): Promise<UserRelationNetwork> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      const edgesData = await manager.query(
        `
        WITH like_relations AS (
          SELECT
            l.user_weibo_id as source_user_id,
            p.user->>'id' as target_user_id,
            COUNT(*) as like_count,
            0 as comment_count,
            0 as repost_count
          FROM weibo_likes l
          JOIN weibo_posts p ON l.target_weibo_id = p.id
          WHERE l.created_at >= $1
            AND l.created_at <= $2
            AND l.user_weibo_id != p.user->>'id'
          GROUP BY l.user_weibo_id, p.user->>'id'
        ),
        comment_relations AS (
          SELECT
            c.user->>'id' as source_user_id,
            p.user->>'id' as target_user_id,
            0 as like_count,
            COUNT(*) as comment_count,
            0 as repost_count
          FROM weibo_comments c
          JOIN weibo_posts p ON c.rootid = p.id
          WHERE c.ingestedAt >= $1
            AND c.ingestedAt <= $2
            AND c.user->>'id' IS NOT NULL
            AND p.user->>'id' IS NOT NULL
            AND c.user->>'id' != p.user->>'id'
          GROUP BY c.user->>'id', p.user->>'id'
        ),
        repost_relations AS (
          SELECT
            r.user->>'id' as source_user_id,
            r.retweeted_status->'user'->>'id' as target_user_id,
            0 as like_count,
            0 as comment_count,
            COUNT(*) as repost_count
          FROM weibo_reposts r
          WHERE r.ingested_at >= $1
            AND r.ingested_at <= $2
            AND r.retweeted_status IS NOT NULL
            AND r.user->>'id' IS NOT NULL
            AND r.retweeted_status->'user'->>'id' IS NOT NULL
            AND r.user->>'id' != r.retweeted_status->'user'->>'id'
          GROUP BY r.user->>'id', r.retweeted_status->'user'->>'id'
        ),
        all_relations AS (
          SELECT * FROM like_relations
          UNION ALL
          SELECT * FROM comment_relations
          UNION ALL
          SELECT * FROM repost_relations
        )
        SELECT
          source_user_id,
          target_user_id,
          SUM(like_count) as like_count,
          SUM(comment_count) as comment_count,
          SUM(repost_count) as repost_count,
          (SUM(like_count) + SUM(comment_count) * 2 + SUM(repost_count) * 3) as weight
        FROM all_relations
        GROUP BY source_user_id, target_user_id
        HAVING (SUM(like_count) + SUM(comment_count) * 2 + SUM(repost_count) * 3) >= $3
        ORDER BY weight DESC
        LIMIT $4
      `,
        [start, end, minWeight, limit]
      );

      return this.buildNetworkFromEdges(edgesData, 'comprehensive', manager);
    });
  }

  private async buildNetworkFromEdges(
    edgesData: any[],
    type: UserRelationType,
    manager: any
  ): Promise<UserRelationNetwork> {
    if (edgesData.length === 0) {
      return {
        nodes: [],
        edges: [],
        statistics: {
          totalUsers: 0,
          totalRelations: 0,
          avgDegree: 0,
          density: 0,
          communities: 0,
        },
      };
    }

    const userIds = new Set<string>();
    edgesData.forEach((edge) => {
      userIds.add(edge.source_user_id);
      userIds.add(edge.target_user_id);
    });

    const userIdsArray = Array.from(userIds);
    const placeholders = userIdsArray.map((_, i) => `$${i + 1}`).join(',');

    const usersData = await manager.query(
      `
      SELECT
        u.id,
        u.idstr,
        u.screen_name,
        u.name,
        u.followers_count,
        u.statuses_count,
        u.verified,
        COALESCE(NULLIF(u.location, ''), NULLIF(u.province, ''), NULLIF(u.city, ''), '未知') as location,
        COALESCE(u.avatar_hd, u.avatar_large, u.profile_image_url) as avatar,
        CASE
          WHEN u.verified_type IN (0, 1, 2, 3) THEN 'official'
          WHEN u.followers_count > 100000 THEN 'kol'
          WHEN u.verified = true THEN 'media'
          ELSE 'normal'
        END as user_type
      FROM weibo_users u
      WHERE u.id IN (${placeholders})
    `,
      userIdsArray
    );

    const usersMap = new Map<string, any>(
      usersData.map((u: any) => [u.id.toString(), u])
    );

    const nodes: UserRelationNode[] = Array.from(userIds).map((userId) => {
      const userData = usersMap.get(userId);
      if (!userData) {
        return {
          id: userId,
          name: `用户_${userId}`,
          followers: 0,
          influence: 0,
          postCount: 0,
          verified: false,
          userType: 'normal',
        };
      }

      const followers = parseInt(userData.followers_count) || 0;
      const posts = parseInt(userData.statuses_count) || 0;
      const influence = Math.min(
        100,
        Math.floor((Math.log10(followers + 1) * 10 + Math.log10(posts + 1) * 5) * 2)
      );

      return {
        id: userId,
        name: userData.screen_name || userData.name || `用户_${userId}`,
        avatar: userData.avatar,
        followers,
        influence,
        postCount: posts,
        verified: userData.verified || false,
        userType: userData.user_type,
        location: userData.location,
      };
    });

    const edges: UserRelationEdge[] = edgesData.map((edge) => ({
      source: edge.source_user_id,
      target: edge.target_user_id,
      weight: parseInt(edge.weight),
      type,
      interactions: {
        likes: edge.like_count ? parseInt(edge.like_count) : undefined,
        comments: edge.comment_count ? parseInt(edge.comment_count) : undefined,
        reposts: edge.repost_count ? parseInt(edge.repost_count) : undefined,
      },
    }));

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
        communities: 0,
      },
    };
  }
}
