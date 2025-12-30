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

    const MAX_LIMIT = 20000;
    const effectiveLimit = Math.min(limit, MAX_LIMIT);

    const cacheKey = CacheService.buildKey(
      CACHE_KEYS.USER_RELATIONS,
      type,
      timeRange,
      minWeight.toString(),
      effectiveLimit.toString()
    );

    const cacheTTL = timeRange === 'all' ? CACHE_TTL.VERY_LONG : CACHE_TTL.MEDIUM;

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchNetwork(type, timeRange, minWeight, effectiveLimit),
      cacheTTL
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
          source_user_id,
          target_user_id,
          weight
        FROM user_relation_statistics
        WHERE relation_type = 'like'
          AND last_interaction_at >= $1
          AND last_interaction_at <= $2
          AND weight >= $3
        ORDER BY weight DESC
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
          source_user_id,
          target_user_id,
          weight
        FROM user_relation_statistics
        WHERE relation_type = 'comment'
          AND last_interaction_at >= $1
          AND last_interaction_at <= $2
          AND weight >= $3
        ORDER BY weight DESC
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
          source_user_id,
          target_user_id,
          weight
        FROM user_relation_statistics
        WHERE relation_type = 'repost'
          AND last_interaction_at >= $1
          AND last_interaction_at <= $2
          AND weight >= $3
        ORDER BY weight DESC
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
        SELECT
          source_user_id,
          target_user_id,
          SUM(CASE WHEN relation_type = 'like' THEN weight ELSE 0 END) as like_count,
          SUM(CASE WHEN relation_type = 'comment' THEN weight ELSE 0 END) as comment_count,
          SUM(CASE WHEN relation_type = 'repost' THEN weight ELSE 0 END) as repost_count,
          SUM(weight) as weight
        FROM user_relation_statistics
        WHERE last_interaction_at >= $1
          AND last_interaction_at <= $2
        GROUP BY source_user_id, target_user_id
        HAVING SUM(weight) >= $3
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

    await manager.query('SET statement_timeout = 30000');

    const BATCH_SIZE = 1000;
    const usersData: any[] = [];
    for (let i = 0; i < userIdsArray.length; i += BATCH_SIZE) {
      const batch = userIdsArray.slice(i, i + BATCH_SIZE);
      const batchResult = await manager.query(
        `SELECT * FROM v_weibo_user_info WHERE id = ANY($1::bigint[])`,
        [batch]
      );
      usersData.push(...batchResult);
    }

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
