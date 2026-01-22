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
      eventId,
      minWeight = 1,
      limit = 100,
    } = params;

    const MAX_LIMIT = 20000;
    const effectiveLimit = Math.min(limit, MAX_LIMIT);

    const cacheKey = CacheService.buildKey(
      CACHE_KEYS.USER_RELATIONS,
      type,
      timeRange,
      eventId || 'none',
      minWeight.toString(),
      effectiveLimit.toString()
    );

    const cacheTTL = timeRange === 'all' ? CACHE_TTL.VERY_LONG : CACHE_TTL.MEDIUM;

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchNetwork(type, timeRange, eventId, minWeight, effectiveLimit),
      cacheTTL
    );
  }

  private async fetchNetwork(
    type: UserRelationType,
    timeRange: TimeRange,
    eventId: string | undefined,
    minWeight: number,
    limit: number
  ): Promise<UserRelationNetwork> {
    switch (type) {
      case 'like':
        return this.buildLikeNetwork(timeRange, eventId, minWeight, limit);
      case 'comment':
        return this.buildCommentNetwork(timeRange, eventId, minWeight, limit);
      case 'repost':
        return this.buildRepostNetwork(timeRange, eventId, minWeight, limit);
      case 'comprehensive':
        return this.buildComprehensiveNetwork(timeRange, eventId, minWeight, limit);
      default:
        return this.buildComprehensiveNetwork(timeRange, eventId, minWeight, limit);
    }
  }

  private async buildLikeNetwork(
    timeRange: TimeRange,
    eventId: string | undefined,
    minWeight: number,
    limit: number
  ): Promise<UserRelationNetwork> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      let query = `
        SELECT
          urs.source_user_id,
          urs.target_user_id,
          urs.weight
        FROM user_relation_statistics urs
      `;
      const params: any[] = [];
      const conditions: string[] = [];

      conditions.push("urs.relation_type = 'like'");
      conditions.push("urs.last_interaction_at >= $1");
      params.push(start);
      conditions.push("urs.last_interaction_at <= $2");
      params.push(end);
      conditions.push("urs.weight >= $3");
      params.push(minWeight);

      // 如果指定了事件，通过微博关联过滤
      if (eventId) {
        query += `
          INNER JOIN weibo_posts wp ON (
            (wp.user_id::bigint = urs.source_user_id OR wp.user_id::bigint = urs.target_user_id)
            AND wp.event_id = $${params.length + 1}
          )
        `;
        params.push(eventId);
      }

      query += ` WHERE ${conditions.join(' AND ')}`;
      query += `
        ORDER BY urs.weight DESC
        LIMIT $${params.length + 1}
      `;
      params.push(limit);

      const edgesData = await manager.query(query, params);
      return this.buildNetworkFromEdges(edgesData, 'like', manager);
    });
  }

  private async buildCommentNetwork(
    timeRange: TimeRange,
    eventId: string | undefined,
    minWeight: number,
    limit: number
  ): Promise<UserRelationNetwork> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      let query = `
        SELECT
          urs.source_user_id,
          urs.target_user_id,
          urs.weight
        FROM user_relation_statistics urs
      `;
      const params: any[] = [];
      const conditions: string[] = [];

      conditions.push("urs.relation_type = 'comment'");
      conditions.push("urs.last_interaction_at >= $1");
      params.push(start);
      conditions.push("urs.last_interaction_at <= $2");
      params.push(end);
      conditions.push("urs.weight >= $3");
      params.push(minWeight);

      if (eventId) {
        query += `
          INNER JOIN weibo_posts wp ON (
            (wp.user_id::bigint = urs.source_user_id OR wp.user_id::bigint = urs.target_user_id)
            AND wp.event_id = $${params.length + 1}
          )
        `;
        params.push(eventId);
      }

      query += ` WHERE ${conditions.join(' AND ')}`;
      query += `
        ORDER BY urs.weight DESC
        LIMIT $${params.length + 1}
      `;
      params.push(limit);

      const edgesData = await manager.query(query, params);
      return this.buildNetworkFromEdges(edgesData, 'comment', manager);
    });
  }

  private async buildRepostNetwork(
    timeRange: TimeRange,
    eventId: string | undefined,
    minWeight: number,
    limit: number
  ): Promise<UserRelationNetwork> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      let query = `
        SELECT
          urs.source_user_id,
          urs.target_user_id,
          urs.weight
        FROM user_relation_statistics urs
      `;
      const params: any[] = [];
      const conditions: string[] = [];

      conditions.push("urs.relation_type = 'repost'");
      conditions.push("urs.last_interaction_at >= $1");
      params.push(start);
      conditions.push("urs.last_interaction_at <= $2");
      params.push(end);
      conditions.push("urs.weight >= $3");
      params.push(minWeight);

      if (eventId) {
        query += `
          INNER JOIN weibo_posts wp ON (
            (wp.user_id::bigint = urs.source_user_id OR wp.user_id::bigint = urs.target_user_id)
            AND wp.event_id = $${params.length + 1}
          )
        `;
        params.push(eventId);
      }

      query += ` WHERE ${conditions.join(' AND ')}`;
      query += `
        ORDER BY urs.weight DESC
        LIMIT $${params.length + 1}
      `;
      params.push(limit);

      const edgesData = await manager.query(query, params);
      return this.buildNetworkFromEdges(edgesData, 'repost', manager);
    });
  }

  private async buildComprehensiveNetwork(
    timeRange: TimeRange,
    eventId: string | undefined,
    minWeight: number,
    limit: number
  ): Promise<UserRelationNetwork> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      let query = `
        SELECT
          urs.source_user_id,
          urs.target_user_id,
          SUM(CASE WHEN urs.relation_type = 'like' THEN urs.weight ELSE 0 END) as like_count,
          SUM(CASE WHEN urs.relation_type = 'comment' THEN urs.weight ELSE 0 END) as comment_count,
          SUM(CASE WHEN urs.relation_type = 'repost' THEN urs.weight ELSE 0 END) as repost_count,
          SUM(urs.weight) as weight
        FROM user_relation_statistics urs
      `;
      const params: any[] = [];
      const conditions: string[] = [];

      conditions.push("urs.last_interaction_at >= $1");
      params.push(start);
      conditions.push("urs.last_interaction_at <= $2");
      params.push(end);

      if (eventId) {
        query += `
          INNER JOIN weibo_posts wp ON (
            (wp.user_id::bigint = urs.source_user_id OR wp.user_id::bigint = urs.target_user_id)
            AND wp.event_id = $${params.length + 1}
          )
        `;
        params.push(eventId);
      }

      query += ` WHERE ${conditions.join(' AND ')}`;
      query += `
        GROUP BY urs.source_user_id, urs.target_user_id
        HAVING SUM(urs.weight) >= $${params.length + 1}
      `;
      params.push(minWeight);
      query += `
        ORDER BY weight DESC
        LIMIT $${params.length + 1}
      `;
      params.push(limit);

      const edgesData = await manager.query(query, params);
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
        `SELECT * FROM weibo_users WHERE id = ANY($1::bigint[])`,
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
