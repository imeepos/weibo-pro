/**
 * 重新计算统计：按小时聚合的 SQL 查询模块。
 * 负责从 weibo_posts / weibo_comments / weibo_likes / weibo_reposts
 * 查询事件时间范围内的统计数据。
 */

export interface HourlyStats {
  event_id: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  post_count?: number;
  comment_count?: number;
  like_count?: number;
  repost_count?: number;
  user_count?: number;
}

export async function queryPostStats(
  manager: any,
  eventId: string,
  startDate: Date,
  endDate: Date
): Promise<HourlyStats[]> {
  return manager.query(`
    SELECT
      event_id,
      EXTRACT(YEAR FROM created_at)::int as year,
      EXTRACT(MONTH FROM created_at)::int as month,
      EXTRACT(DAY FROM created_at)::int as day,
      EXTRACT(HOUR FROM created_at)::int as hour,
      COUNT(*)::int as post_count,
      COUNT(DISTINCT user_id)::int as user_count
    FROM weibo_posts
    WHERE event_id = $1
      AND created_at >= $2
      AND created_at < $3
    GROUP BY event_id, year, month, day, hour
  `, [eventId, startDate, endDate]);
}

export async function queryCommentStats(
  manager: any,
  eventId: string,
  startDate: Date,
  endDate: Date
): Promise<HourlyStats[]> {
  return manager.query(`
    SELECT
      p.event_id,
      EXTRACT(YEAR FROM c.created_at::timestamp)::int as year,
      EXTRACT(MONTH FROM c.created_at::timestamp)::int as month,
      EXTRACT(DAY FROM c.created_at::timestamp)::int as day,
      EXTRACT(HOUR FROM c.created_at::timestamp)::int as hour,
      COUNT(*)::int as comment_count,
      COUNT(DISTINCT c.user_id)::int as user_count
    FROM weibo_comments c
    JOIN weibo_posts p ON c.post_id::bigint = p.id
    WHERE p.event_id = $1
      AND c.created_at::timestamp >= $2
      AND c.created_at::timestamp < $3
    GROUP BY p.event_id, year, month, day, hour
  `, [eventId, startDate, endDate]);
}

export async function queryLikeStats(
  manager: any,
  eventId: string,
  startDate: Date,
  endDate: Date
): Promise<HourlyStats[]> {
  return manager.query(`
    SELECT
      p.event_id,
      EXTRACT(YEAR FROM p.created_at)::int as year,
      EXTRACT(MONTH FROM p.created_at)::int as month,
      EXTRACT(DAY FROM p.created_at)::int as day,
      EXTRACT(HOUR FROM p.created_at)::int as hour,
      COUNT(*)::int as like_count,
      COUNT(DISTINCT l.user_weibo_id)::int as user_count
    FROM weibo_likes l
    JOIN weibo_posts p ON l.target_weibo_id::bigint = p.id
    WHERE p.event_id = $1
      AND p.created_at >= $2
      AND p.created_at < $3
    GROUP BY p.event_id, year, month, day, hour
  `, [eventId, startDate, endDate]);
}

export async function queryRepostStats(
  manager: any,
  eventId: string,
  startDate: Date,
  endDate: Date
): Promise<HourlyStats[]> {
  return manager.query(`
    SELECT
      p.event_id,
      EXTRACT(YEAR FROM r.created_at)::int as year,
      EXTRACT(MONTH FROM r.created_at)::int as month,
      EXTRACT(DAY FROM r.created_at)::int as day,
      EXTRACT(HOUR FROM r.created_at)::int as hour,
      COUNT(*)::int as repost_count,
      COUNT(DISTINCT r.user_id)::int as user_count
    FROM weibo_reposts r
    JOIN weibo_posts p ON r.post_id::bigint = p.id
    WHERE p.event_id = $1
      AND r.created_at >= $2
      AND r.created_at < $3
    GROUP BY p.event_id, year, month, day, hour
  `, [eventId, startDate, endDate]);
}
