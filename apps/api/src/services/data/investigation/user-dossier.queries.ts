/**
 * 用户档案(dossier)数据查询模块。
 * 集中管理 UserDossierService 所需的所有 SQL 查询，
 * 每个函数只负责执行查询并返回原始行数据，不包含业务映射逻辑。
 */

export interface DossierQueryRunner {
  query(sql: string, params?: any[]): Promise<any[]>;
}

export function queryAccountSnapshot(
  manager: DossierQueryRunner,
  weiboUserId: string,
): Promise<any[]> {
  return manager.query(
    `
      SELECT
        u.id::text AS weibo_user_id,
        u.screen_name,
        u.name,
        COALESCE(u.avatar_hd, u.avatar_large, u.profile_image_url) AS avatar,
        u.description,
        COALESCE(NULLIF(u.location, ''), NULLIF(u.province, ''), NULLIF(u.city, ''), NULL) AS location,
        COALESCE(u.followers_count, 0) AS followers_count,
        COALESCE(u.friends_count, 0) AS friends_count,
        COALESCE(u.statuses_count, 0) AS statuses_count,
        COALESCE(u.verified, false) AS verified,
        u.verified_type,
        u.verified_reason,
        u.credit_score,
        u.urisk,
        u.created_at
      FROM weibo_users u
      WHERE u.id::text = $1 OR u.idstr = $1
      LIMIT 1
    `,
    [weiboUserId],
  );
}

export function queryEvidenceHistory(
  manager: DossierQueryRunner,
  weiboUserId: string,
  windowStart: Date | null,
): Promise<any[]> {
  return manager.query(
    `
      SELECT p.id::text AS source_id, COALESCE(p.text_raw, p.text, '') AS excerpt
      FROM weibo_posts p
      WHERE p.user_id::text = $1
        AND p.deleted_at IS NULL
        AND ($2::timestamptz IS NULL OR p.created_at >= $2::timestamptz)
      ORDER BY p.created_at DESC NULLS LAST
      LIMIT 5
    `,
    [weiboUserId, windowStart],
  );
}

export function queryEvidenceEvent(
  manager: DossierQueryRunner,
  weiboUserId: string,
  eventId: string,
  windowStart: Date | null,
): Promise<any[]> {
  return manager.query(
    `
      SELECT p.id::text AS source_id, COALESCE(p.text_raw, p.text, '') AS excerpt
      FROM weibo_posts p
      WHERE p.user_id::text = $1
        AND p.event_id = $2
        AND p.deleted_at IS NULL
        AND ($3::timestamptz IS NULL OR p.created_at >= $3::timestamptz)
      ORDER BY p.created_at DESC NULLS LAST
      LIMIT 5
    `,
    [weiboUserId, eventId, windowStart],
  );
}

export function queryEvidenceRelation(
  manager: DossierQueryRunner,
  weiboUserId: string,
  windowStart: Date | null,
): Promise<any[]> {
  return manager.query(
    `
      SELECT
        CASE
          WHEN source_user_id::text = $1 THEN target_user_id::text
          ELSE source_user_id::text
        END AS source_id,
        relation_type,
        SUM(weight) AS total_weight
      FROM user_relation_statistics
      WHERE (source_user_id::text = $1
         OR target_user_id::text = $1)
        AND ($2::timestamptz IS NULL OR COALESCE(last_interaction_at, updated_at, created_at) >= $2::timestamptz)
      GROUP BY source_id, relation_type
      ORDER BY total_weight DESC
      LIMIT 5
    `,
    [weiboUserId, windowStart],
  );
}

export function queryEvidenceNlp(
  manager: DossierQueryRunner,
  weiboUserId: string,
  windowStart: Date | null,
): Promise<any[]> {
  return manager.query(
    `
      SELECT
        p.id::text AS source_id,
        COALESCE(p.text_raw, p.text, '') AS excerpt,
        nlp.sentiment->>'overall' AS overall
      FROM post_nlp_results nlp
      JOIN weibo_posts p ON p.id = nlp.post_id
      WHERE p.user_id::text = $1
        AND p.deleted_at IS NULL
        AND ($2::timestamptz IS NULL OR p.created_at >= $2::timestamptz)
      ORDER BY p.created_at DESC NULLS LAST
      LIMIT 5
    `,
    [weiboUserId, windowStart],
  );
}

export function queryEventRiskContext(
  manager: DossierQueryRunner,
  weiboUserId: string,
  eventId: string,
): Promise<any[]> {
  return manager.query(
    `
      SELECT
        COUNT(*) AS post_count,
        MIN(p.created_at) AS first_seen_at,
        MAX(p.created_at) AS last_seen_at,
        SUM(COALESCE(p.comments_count, 0) + COALESCE(p.reposts_count, 0) + COALESCE(p.attitudes_count, 0)) AS interaction_count,
        COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) AS negative_count,
        COUNT(DISTINCT nlp.id) AS analyzed_count
      FROM weibo_posts p
      LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
      WHERE p.user_id::text = $1
        AND p.event_id = $2
        AND p.deleted_at IS NULL
    `,
    [weiboUserId, eventId],
  );
}

export function queryHistoryCoverage(
  manager: DossierQueryRunner,
  weiboUserId: string,
  windowStart: Date | null,
): Promise<any[]> {
  return manager.query(
    `
      SELECT
        COUNT(*) AS post_count,
        MIN(created_at) AS start_at,
        MAX(created_at) AS end_at
      FROM weibo_posts
      WHERE user_id::text = $1
        AND deleted_at IS NULL
        AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
    `,
    [weiboUserId, windowStart],
  );
}

export function queryPostingByDay(
  manager: DossierQueryRunner,
  weiboUserId: string,
  windowStart: Date | null,
): Promise<any[]> {
  return manager.query(
    `
      SELECT
        DATE_TRUNC('day', created_at) AS day,
        COUNT(*) AS count
      FROM weibo_posts
      WHERE user_id::text = $1
        AND deleted_at IS NULL
        AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day DESC
      LIMIT 14
    `,
    [weiboUserId, windowStart],
  );
}

export function queryPostingByHour(
  manager: DossierQueryRunner,
  weiboUserId: string,
  windowStart: Date | null,
): Promise<any[]> {
  return manager.query(
    `
      SELECT
        EXTRACT(HOUR FROM created_at) AS hour,
        COUNT(*) AS count
      FROM weibo_posts
      WHERE user_id::text = $1
        AND deleted_at IS NULL
        AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour ASC
    `,
    [weiboUserId, windowStart],
  );
}

export function queryInteractionByDay(
  manager: DossierQueryRunner,
  weiboUserId: string,
  windowStart: Date | null,
): Promise<any[]> {
  return manager.query(
    `
      SELECT
        DATE_TRUNC('day', created_at) AS day,
        SUM(COALESCE(comments_count, 0) + COALESCE(reposts_count, 0) + COALESCE(attitudes_count, 0)) AS count
      FROM weibo_posts
      WHERE user_id::text = $1
        AND deleted_at IS NULL
        AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day DESC
      LIMIT 14
    `,
    [weiboUserId, windowStart],
  );
}

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

export function queryRelationSummary(
  manager: DossierQueryRunner,
  weiboUserId: string,
  windowStart: Date | null,
): Promise<any[]> {
  return manager.query(
    `
      SELECT
        CASE
          WHEN source_user_id::text = $1 THEN target_user_id::text
          ELSE source_user_id::text
        END AS related_user_id,
        relation_type,
        SUM(weight) AS total_weight
      FROM user_relation_statistics
      WHERE (source_user_id::text = $1
         OR target_user_id::text = $1)
        AND ($2::timestamptz IS NULL OR COALESCE(last_interaction_at, updated_at, created_at) >= $2::timestamptz)
      GROUP BY related_user_id, relation_type
      ORDER BY total_weight DESC
      LIMIT 5
    `,
    [weiboUserId, windowStart],
  );
}
