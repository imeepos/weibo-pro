import { useEntityManager } from '@sker/entities';
import { getTimeRangeBoundaries } from '../time-range.utils';
import type { TimeRange } from '../types';
import type { RiskLevel, UserListItem, UserListResponse } from './types';
import { buildUserDataQuality } from './user-data-quality';

export async function fetchUserList(
  timeRange: TimeRange,
  page: number = 1,
  pageSize: number = 20,
): Promise<UserListResponse> {
  return useEntityManager(async (manager) => {
    const { start, end } = getTimeRangeBoundaries(timeRange);
    const offset = (page - 1) * pageSize;

    const results = await manager.query(`
      WITH user_activity AS (
        SELECT
          p.user_id as user_id,
          COUNT(p.id) as post_count,
          MAX(p.ingested_at) as last_active,
          COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN nlp.id END) as positive_count,
          COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) as negative_count,
          COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN nlp.id END) as neutral_count,
          COUNT(DISTINCT nlp.id) as analyzed_count
        FROM weibo_posts p
        LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
        WHERE p.ingested_at >= $1::timestamptz
          AND p.ingested_at <= $2::timestamptz
          AND p.deleted_at IS NULL
          AND p.user_id IS NOT NULL
        GROUP BY p.user_id
      ),
      all_user_activity AS (
        SELECT
          p.user_id as user_id,
          COUNT(p.id) as total_post_count,
          MAX(p.ingested_at) as last_post_time
        FROM weibo_posts p
        WHERE p.deleted_at IS NULL
          AND p.user_id IS NOT NULL
        GROUP BY p.user_id
      ),
      eligible_activity AS (
        SELECT *
        FROM user_activity
        WHERE post_count >= 2
          AND analyzed_count > 0
      )
      SELECT
        u.id,
        u.idstr,
        u.screen_name,
        u.name,
        u.followers_count,
        u.friends_count,
        u.statuses_count,
        u.verified,
        COALESCE(NULLIF(u.location, ''), NULLIF(u.province, ''), NULLIF(u.city, ''), '未知') as location,
        COALESCE(ua.post_count, 0) as activity_posts,
        COALESCE(ua.positive_count, 0) as sentiment_positive,
        COALESCE(ua.negative_count, 0) as sentiment_negative,
        COALESCE(ua.neutral_count, 0) as sentiment_neutral,
        COALESCE(ua.analyzed_count, 0) as analyzed_count,
        COALESCE(ua.last_active, aua.last_post_time, u.created_at::timestamptz) as last_active,
        CASE
          WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.6 THEN 'high'
          WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.3 THEN 'medium'
          ELSE 'low'
        END as risk_level,
        COALESCE(u.avatar_hd, u.avatar_large, u.profile_image_url) as avatar
      FROM weibo_users u
      INNER JOIN eligible_activity ua ON ua.user_id = u.id
      LEFT JOIN all_user_activity aua ON aua.user_id = u.id
      ORDER BY
        COALESCE(ua.post_count, 0) DESC,
        COALESCE(aua.total_post_count, 0) DESC,
        u.followers_count DESC
      LIMIT $3 OFFSET $4
    `, [start, end, pageSize, offset]);

    const totalResult = await manager.query(`
      WITH user_activity AS (
        SELECT
          p.user_id AS user_id,
          COUNT(p.id) AS post_count,
          COUNT(DISTINCT nlp.id) AS analyzed_count
        FROM weibo_posts p
        LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
        WHERE p.ingested_at >= $1::timestamptz
          AND p.ingested_at <= $2::timestamptz
          AND p.deleted_at IS NULL
          AND p.user_id IS NOT NULL
        GROUP BY p.user_id
      )
      SELECT
        COUNT(*) AS candidate_count,
        COUNT(*) FILTER (WHERE post_count >= 2 AND analyzed_count > 0) AS eligible_count
      FROM user_activity
    `, [start, end]);
    const quality = buildUserDataQuality(
      parseInt(totalResult[0]?.candidate_count) || 0,
      parseInt(totalResult[0]?.eligible_count) || 0,
    );
    const totalCount = quality.eligibleCount;

    const users: UserListItem[] = results.map((row: any) => {
      const analyzedCount = parseInt(row.analyzed_count);
      const positiveCount = parseInt(row.sentiment_positive);
      const negativeCount = parseInt(row.sentiment_negative);
      const neutralCount = parseInt(row.sentiment_neutral);

      const total = analyzedCount || 1;
      const positivePercent = Math.round((positiveCount / total) * 100);
      const negativePercent = Math.round((negativeCount / total) * 100);
      const neutralPercent = Math.round((neutralCount / total) * 100);

      const tags: string[] = [];
      if (row.verified) tags.push('已认证');
      if (row.followers_count > 10000) tags.push('大V');
      if (positivePercent > 70) tags.push('正面');
      if (negativePercent > 50) tags.push('负面');

      return {
        id: row.idstr || String(row.id),
        username: row.screen_name || `user_${row.id}`,
        nickname: row.name || row.screen_name || '未知用户',
        followers: row.followers_count || 0,
        following: row.friends_count || 0,
        posts: row.statuses_count || 0,
        verified: row.verified || false,
        location: row.location,
        riskLevel: row.risk_level as RiskLevel,
        activities: {
          posts: parseInt(row.activity_posts) || 0,
          comments: 0
        },
        sentiment: {
          positive: positivePercent,
          negative: negativePercent,
          neutral: neutralPercent
        },
        tags,
        lastActive: row.last_active,
        avatar: row.avatar
      };
    });

    const totalPages = Math.ceil(totalCount / pageSize);
    return {
      users,
      total: totalCount,
      filteredCount: quality.filteredCount,
      coverageRate: quality.coverageRate,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages
    };
  });
}
