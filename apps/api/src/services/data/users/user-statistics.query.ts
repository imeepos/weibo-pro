import { useEntityManager } from '@sker/entities';
import { getPreviousTimeRangeBoundaries, getTimeRangeBoundaries } from '../time-range.utils';
import type { TimeRange } from '../types';
import type { UserStatistics } from './types';
import { buildUserDataQuality } from './user-data-quality';

export async function fetchStatistics(timeRange: TimeRange): Promise<UserStatistics> {
  return useEntityManager(async (manager) => {
    const current = getTimeRangeBoundaries(timeRange);
    const previous = getPreviousTimeRangeBoundaries(timeRange);

    const currentStats = await manager.query(`
      WITH user_activity AS (
        SELECT
          p.user_id as user_id,
          COUNT(p.id) as post_count,
          COUNT(DISTINCT nlp.id) as analyzed_count,
          COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) as negative_count
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
          ua.user_id,
          ua.analyzed_count,
          CASE
            WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.6 THEN 'high'
            WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.3 THEN 'medium'
            ELSE 'low'
          END as risk_level,
          CASE
            WHEN ua.analyzed_count > 0 THEN (ua.negative_count::float / ua.analyzed_count) * 100
            ELSE 0
          END as risk_score
        FROM user_activity ua
        WHERE ua.post_count >= 2
          AND ua.analyzed_count > 0
      )
      SELECT
        COUNT(*) as total_users,
        (SELECT COUNT(*) FROM user_activity) as candidate_users,
        COUNT(*) as total_active,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk,
        COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risk,
        COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risk,
        AVG(risk_score) as avg_risk_score
      FROM user_risk
    `, [current.start, current.end]);

    const previousStats = await manager.query(`
      WITH user_activity AS (
        SELECT
          p.user_id as user_id,
          COUNT(p.id) as post_count,
          COUNT(DISTINCT nlp.id) as analyzed_count,
          COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) as negative_count
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
          COALESCE(ua.analyzed_count, 0) as analyzed_count,
          CASE
            WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.6 THEN 'high'
            WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.3 THEN 'medium'
            ELSE 'low'
          END as risk_level
        FROM weibo_users u
        INNER JOIN user_activity ua
          ON ua.user_id = u.id
         AND ua.post_count >= 2
         AND ua.analyzed_count > 0
      )
      SELECT
        COUNT(CASE WHEN analyzed_count > 0 THEN 1 END) as total_active,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk,
        COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risk,
        COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risk
      FROM user_risk
    `, [previous.start, previous.end]);

    // 计算过去7天的趋势数据
    const trendDataResult = await manager.query(`
      WITH RECURSIVE date_series AS (
        SELECT $1::timestamptz - INTERVAL '6 days' as date
        UNION ALL
        SELECT date + INTERVAL '1 day'
        FROM date_series
        WHERE date < $1::timestamptz
      ),
      daily_user_activity AS (
        SELECT
          DATE_TRUNC('day', p.ingested_at) as day,
          p.user_id as user_id,
          COUNT(p.id) as post_count,
          COUNT(DISTINCT nlp.id) as analyzed_count,
          COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) as negative_count
        FROM weibo_posts p
        LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
        WHERE p.ingested_at >= $1::timestamptz - INTERVAL '6 days'
          AND p.ingested_at <= $1::timestamptz
          AND p.deleted_at IS NULL
          AND p.user_id IS NOT NULL
        GROUP BY DATE_TRUNC('day', p.ingested_at), p.user_id
      ),
      cumulative_user_activity AS (
        SELECT
          ds.date,
          dua.user_id,
          SUM(dua.post_count) as post_count,
          SUM(dua.analyzed_count) as analyzed_count,
          SUM(dua.negative_count) as negative_count
        FROM date_series ds
        INNER JOIN daily_user_activity dua ON DATE_TRUNC('day', dua.day) <= ds.date
        GROUP BY ds.date, dua.user_id
      ),
      daily_user_risk AS (
        SELECT
          ds.date,
          COUNT(DISTINCT CASE
            WHEN cua.post_count >= 2 AND cua.analyzed_count > 0
            THEN cua.user_id
          END) as total_users,
          COUNT(DISTINCT CASE
            WHEN cua.post_count >= 2
              AND cua.analyzed_count > 0
              AND (cua.negative_count::float / cua.analyzed_count) > 0.6
            THEN cua.user_id
          END) as high_risk,
          COUNT(DISTINCT CASE
            WHEN cua.post_count >= 2
              AND cua.analyzed_count > 0
              AND (cua.negative_count::float / cua.analyzed_count) > 0.3
              AND (cua.negative_count::float / cua.analyzed_count) <= 0.6
            THEN cua.user_id
          END) as medium_risk,
          COUNT(DISTINCT CASE
            WHEN cua.post_count >= 2
              AND cua.analyzed_count > 0
              AND (cua.negative_count::float / cua.analyzed_count) <= 0.3
            THEN cua.user_id
          END) as low_risk
        FROM date_series ds
        LEFT JOIN cumulative_user_activity cua ON cua.date = ds.date
        GROUP BY ds.date
        ORDER BY ds.date
      )
      SELECT
        date,
        total_users,
        high_risk,
        medium_risk,
        low_risk
      FROM daily_user_risk
      ORDER BY date
    `, [current.end]);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activityStats = await manager.query(`
      WITH user_activity AS (
        SELECT
          p.user_id,
          COUNT(*) FILTER (WHERE p.ingested_at >= $1::timestamptz) AS posts_today,
          COUNT(*) FILTER (WHERE p.ingested_at >= $2::timestamptz) AS posts_week,
          COUNT(*) AS posts_month,
          COUNT(DISTINCT nlp.id) FILTER (WHERE p.ingested_at >= $1::timestamptz) AS analyzed_today,
          COUNT(DISTINCT nlp.id) FILTER (WHERE p.ingested_at >= $2::timestamptz) AS analyzed_week,
          COUNT(DISTINCT nlp.id) AS analyzed_month
        FROM weibo_posts p
        LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
        WHERE p.ingested_at >= $3::timestamptz
          AND p.deleted_at IS NULL
          AND p.user_id IS NOT NULL
        GROUP BY p.user_id
      )
      SELECT
        COUNT(*) FILTER (WHERE posts_today >= 2 AND analyzed_today > 0) as active_today,
        COUNT(*) FILTER (WHERE posts_week >= 2 AND analyzed_week > 0) as active_week,
        COUNT(*) FILTER (WHERE posts_month >= 2 AND analyzed_month > 0) as active_month
      FROM user_activity
    `, [oneDayAgo, sevenDaysAgo, thirtyDaysAgo]);

    const row = currentStats[0] || {};
    const prevRow = previousStats[0] || {};
    const actRow = activityStats[0] || {};

    const totalActive = parseInt(row.total_active) || 0;
    const quality = buildUserDataQuality(
      parseInt(row.candidate_users) || 0,
      parseInt(row.total_users) || 0,
    );
    const prevTotalActive = parseInt(prevRow.total_active) || 0;
    const avgRiskScore = parseFloat(row.avg_risk_score) || 0;

    const currentHighRisk = parseInt(row.high_risk) || 0;
    const currentMediumRisk = parseInt(row.medium_risk) || 0;
    const currentLowRisk = parseInt(row.low_risk) || 0;

    const prevHighRisk = parseInt(prevRow.high_risk) || 0;
    const prevMediumRisk = parseInt(prevRow.medium_risk) || 0;
    const prevLowRisk = parseInt(prevRow.low_risk) || 0;

    const totalGrowthRate = prevTotalActive > 0
      ? ((totalActive - prevTotalActive) / prevTotalActive) * 100
      : 0;

    // 计算变化百分比
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    // 提取趋势数据
    const trendData = {
      total: trendDataResult.map((r: any) => parseInt(r.total_users) || 0),
      highRisk: trendDataResult.map((r: any) => parseInt(r.high_risk) || 0),
      mediumRisk: trendDataResult.map((r: any) => parseInt(r.medium_risk) || 0),
      lowRisk: trendDataResult.map((r: any) => parseInt(r.low_risk) || 0),
    };

    return {
      total: quality.eligibleCount,
      filteredCount: quality.filteredCount,
      coverageRate: quality.coverageRate,
      active: totalActive,
      suspended: 0,
      banned: 0,
      monitoring: currentMediumRisk + currentHighRisk,
      riskDistribution: {
        low: currentLowRisk,
        medium: currentMediumRisk,
        high: currentHighRisk,
        critical: 0
      },
      newUsers: {
        today: 0,
        week: 0,
        month: 0
      },
      activeUsers: {
        today: parseInt(actRow.active_today) || 0,
        week: parseInt(actRow.active_week) || 0,
        month: parseInt(actRow.active_month) || 0
      },
      averageRiskScore: Number(avgRiskScore.toFixed(1)),
      trends: {
        totalGrowthRate: Number(totalGrowthRate.toFixed(1)),
        riskScoreChange: 0,
        newUsersGrowthRate: 0
      },
      trendData,
      changes: {
        total: calculateChange(totalActive, prevTotalActive),
        highRisk: calculateChange(currentHighRisk, prevHighRisk),
        mediumRisk: calculateChange(currentMediumRisk, prevMediumRisk),
        lowRisk: calculateChange(currentLowRisk, prevLowRisk),
      }
    };
  });
}
