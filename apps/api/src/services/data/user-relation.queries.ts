import { useEntityManager } from '@sker/entities';
import { getTimeRangeBoundaries } from './time-range.utils';
import type { TimeRange } from './types';
import type {
  UserRelationNetwork,
  UserRelationType,
} from '@sker/sdk';
import { buildNetworkFromEdges } from './user-relation.mapper';

/**
 * 构建单一关系类型网络（like / comment / repost）
 */
export async function buildSingleTypeNetwork(
  relationType: 'like' | 'comment' | 'repost',
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

    conditions.push(`urs.relation_type = '${relationType}'`);
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
    return buildNetworkFromEdges(edgesData, relationType, manager);
  });
}

/**
 * 构建综合网络（聚合 like/comment/repost 权重）
 */
export async function buildComprehensiveNetwork(
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
    return buildNetworkFromEdges(edgesData, 'comprehensive', manager);
  });
}

export type { UserRelationType };
