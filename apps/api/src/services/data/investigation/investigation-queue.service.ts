import { Injectable } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import type {
  UserInvestigationQueueResponse,
} from '@sker/sdk';
import type {
  InvestigationQueueOptions,
  InvestigationQueueRow,
} from './types';

@Injectable({ providedIn: 'root' })
export class InvestigationQueueService {
  async getQueue(query: InvestigationQueueOptions): Promise<UserInvestigationQueueResponse> {
    const rows = await this.fetchQueueRows(query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const total = rows.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return {
      items: rows.map(({ taskStatus, ...item }) => ({
        ...item,
        status: taskStatus,
      })),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  protected async fetchQueueRows(_query: InvestigationQueueOptions): Promise<InvestigationQueueRow[]> {
    return useEntityManager(async (manager) => {
      const rows = await manager.query(
        `
          WITH user_activity AS (
            SELECT
              p.user_id::text AS weibo_user_id,
              COUNT(p.id) AS post_count,
              COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) AS negative_count,
              COUNT(DISTINCT nlp.id) AS analyzed_count
            FROM weibo_posts p
            LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
            WHERE p.deleted_at IS NULL
              AND p.user_id IS NOT NULL
            GROUP BY p.user_id
          ),
          latest_task AS (
            SELECT DISTINCT ON (t.weibo_user_id)
              t.weibo_user_id::text AS weibo_user_id,
              t.status,
              t.created_at
            FROM user_profile_distillation_tasks t
            ORDER BY t.weibo_user_id, t.created_at DESC
          ),
          persona_link AS (
            SELECT DISTINCT l.weibo_user_id::text AS weibo_user_id
            FROM weibo_user_persona_links l
            WHERE l.status = 'active'
          )
          SELECT
            u.id::text AS weibo_user_id,
            COALESCE(u.screen_name, u.name, u.id::text) AS screen_name,
            COALESCE(u.avatar_hd, u.avatar_large, u.profile_image_url) AS avatar,
            CASE
              WHEN ua.analyzed_count > 0
                THEN ROUND(LEAST(100, (ua.negative_count::decimal / ua.analyzed_count) * 100))
              ELSE 0
            END AS event_risk_score,
            CASE
              WHEN ua.analyzed_count > 0 AND (ua.negative_count::decimal / ua.analyzed_count) > 0.8 THEN 'critical'
              WHEN ua.analyzed_count > 0 AND (ua.negative_count::decimal / ua.analyzed_count) > 0.6 THEN 'high'
              WHEN ua.analyzed_count > 0 AND (ua.negative_count::decimal / ua.analyzed_count) > 0.3 THEN 'medium'
              ELSE 'low'
            END AS event_risk_level,
            COALESCE(lt.status, 'queued') AS task_status,
            (pl.weibo_user_id IS NOT NULL) AS has_persona,
            lt.created_at AS last_distilled_at,
            ARRAY[
              CASE
                WHEN ua.analyzed_count > 0 AND (ua.negative_count::decimal / ua.analyzed_count) > 0.6
                  THEN '高负向占比'
                ELSE NULL
              END,
              CASE
                WHEN COALESCE(ua.post_count, 0) >= 10 THEN '高频发帖'
                ELSE NULL
              END
            ] AS risk_signals
          FROM weibo_users u
          LEFT JOIN user_activity ua ON ua.weibo_user_id = u.id::text
          LEFT JOIN latest_task lt ON lt.weibo_user_id = u.id::text
          LEFT JOIN persona_link pl ON pl.weibo_user_id = u.id::text
          WHERE COALESCE(ua.post_count, 0) > 0
          ORDER BY event_risk_score DESC, lt.created_at DESC NULLS LAST, u.followers_count DESC
          LIMIT $1
        `,
        [_query.pageSize],
      );

      return rows.map((row: any) => ({
        weiboUserId: row.weibo_user_id,
        screenName: row.screen_name,
        avatar: row.avatar,
        eventRiskScore: Number(row.event_risk_score || 0),
        eventRiskLevel: row.event_risk_level,
        taskStatus: row.task_status,
        hasPersona: Boolean(row.has_persona),
        lastDistilledAt: row.last_distilled_at ? new Date(row.last_distilled_at).toISOString() : null,
        riskSignals: (row.risk_signals || []).filter(Boolean),
        status: row.task_status,
      }));
    });
  }
}
