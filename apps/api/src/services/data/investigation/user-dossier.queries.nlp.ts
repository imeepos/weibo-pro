/**
 * 用户档案(dossier)NLP 语义数据查询模块。
 * 集中管理话题关键词、事件类型与情绪趋势相关的 SQL 查询，
 * 只返回原始行数据，不包含业务映射逻辑。
 */

import type { DossierQueryRunner } from './user-dossier.queries';

export function queryTopicKeywords(
  manager: DossierQueryRunner,
  weiboUserId: string,
  windowStart: Date | null,
): Promise<any[]> {
  return manager.query(
    `
      SELECT keyword.keyword AS keyword, SUM((keyword.weight)::numeric) AS total_weight
      FROM post_nlp_results nlp
      JOIN weibo_posts p ON p.id = nlp.post_id
      CROSS JOIN LATERAL jsonb_to_recordset(nlp.keywords) AS keyword(keyword text, weight numeric, sentiment text, pos text, count integer)
      WHERE p.user_id::text = $1
        AND p.deleted_at IS NULL
        AND ($2::timestamptz IS NULL OR p.created_at >= $2::timestamptz)
      GROUP BY keyword.keyword
      ORDER BY total_weight DESC
      LIMIT 8
    `,
    [weiboUserId, windowStart],
  );
}

export function queryEventTypes(
  manager: DossierQueryRunner,
  weiboUserId: string,
  windowStart: Date | null,
): Promise<any[]> {
  return manager.query(
    `
      SELECT
        nlp.event_type->>'type' AS type,
        COUNT(*) AS weight
      FROM post_nlp_results nlp
      JOIN weibo_posts p ON p.id = nlp.post_id
      WHERE p.user_id::text = $1
        AND p.deleted_at IS NULL
        AND nlp.event_type->>'type' IS NOT NULL
        AND ($2::timestamptz IS NULL OR p.created_at >= $2::timestamptz)
      GROUP BY nlp.event_type->>'type'
      ORDER BY weight DESC
      LIMIT 5
    `,
    [weiboUserId, windowStart],
  );
}

export function querySentimentTrend(
  manager: DossierQueryRunner,
  weiboUserId: string,
  windowStart: Date | null,
): Promise<any[]> {
  return manager.query(
    `
      SELECT
        DATE_TRUNC('day', p.created_at) AS timestamp,
        COUNT(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 END) AS positive,
        COUNT(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 END) AS negative,
        COUNT(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 END) AS neutral
      FROM post_nlp_results nlp
      JOIN weibo_posts p ON p.id = nlp.post_id
      WHERE p.user_id::text = $1
        AND p.deleted_at IS NULL
        AND ($2::timestamptz IS NULL OR p.created_at >= $2::timestamptz)
      GROUP BY DATE_TRUNC('day', p.created_at)
      ORDER BY timestamp DESC
      LIMIT 14
    `,
    [weiboUserId, windowStart],
  );
}
