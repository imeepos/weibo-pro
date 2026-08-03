import { useEntityManager } from '@sker/entities';
import { getTimeRangeBoundaries } from '../time-range.utils';
import type { TimeRange } from '../types';
import type { RiskLevelConfig } from './types';

export async function fetchRiskLevels(timeRange: TimeRange): Promise<RiskLevelConfig[]> {
  return useEntityManager(async (manager) => {
    const { start, end } = getTimeRangeBoundaries(timeRange);

    const distribution = await manager.query(`
      WITH user_activity AS (
        SELECT
          p.user_id as user_id,
          COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) as negative_count,
          COUNT(DISTINCT nlp.id) as analyzed_count
        FROM weibo_posts p
        LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
        WHERE p.ingested_at >= $1::timestamptz
          AND p.ingested_at <= $2::timestamptz
          AND p.deleted_at IS NULL
          AND p.user_id IS NOT NULL
        GROUP BY p.user_id
      ),
      user_risk AS (
        SELECT
          u.id as user_id,
          CASE
            WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.6 THEN 'high'
            WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.3 THEN 'medium'
            ELSE 'low'
          END as risk_level
        FROM weibo_users u
        LEFT JOIN user_activity ua ON ua.user_id = u.id
      )
      SELECT
        risk_level,
        COUNT(*) as count
      FROM user_risk
      GROUP BY risk_level
    `, [start, end]);

    const countMap = new Map<string, number>(
      distribution.map((r: any) => [r.risk_level, parseInt(r.count)])
    );

    const levels: RiskLevelConfig[] = [
      {
        level: 'low',
        name: '低风险',
        description: '用户行为正常，无异常活动',
        color: '#10b981',
        minScore: 0,
        maxScore: 30,
        actionRequired: false,
        autoActions: [],
        count: countMap.get('low') || 0
      },
      {
        level: 'medium',
        name: '中风险',
        description: '用户存在部分异常行为，需要关注',
        color: '#f59e0b',
        minScore: 31,
        maxScore: 60,
        actionRequired: true,
        autoActions: ['监控', '记录'],
        count: countMap.get('medium') || 0
      },
      {
        level: 'high',
        name: '高风险',
        description: '用户存在明显异常行为，需要立即处理',
        color: '#ef4444',
        minScore: 61,
        maxScore: 100,
        actionRequired: true,
        autoActions: ['监控', '限制', '通知管理员'],
        count: countMap.get('high') || 0
      }
    ];

    return levels;
  });
}
