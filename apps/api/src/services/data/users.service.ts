import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.service';
import { getTimeRangeBoundaries, getPreviousTimeRangeBoundaries } from './time-range.utils';
import type { TimeRange } from './types';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface UserListItem {
  id: string;
  username: string;
  nickname: string;
  followers: number;
  following: number;
  posts: number;
  verified: boolean;
  location: string;
  riskLevel: RiskLevel;
  activities: {
    posts: number;
    comments: number;
  };
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  tags: string[];
  lastActive: string;
}

export interface RiskLevelConfig {
  level: RiskLevel;
  name: string;
  description: string;
  color: string;
  minScore: number;
  maxScore: number;
  actionRequired: boolean;
  autoActions: string[];
  count?: number;
}

export interface UserStatistics {
  total: number;
  active: number;
  suspended: number;
  banned: number;
  monitoring: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  newUsers: {
    today: number;
    week: number;
    month: number;
  };
  activeUsers: {
    today: number;
    week: number;
    month: number;
  };
  averageRiskScore: number;
  trends: {
    totalGrowthRate: number;
    riskScoreChange: number;
    newUsersGrowthRate: number;
  };
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getUserList(timeRange: TimeRange = '7d') {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.USERS_LIST, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchUserList(timeRange),
      CACHE_TTL.LONG
    );
  }

  private async fetchUserList(timeRange: TimeRange) {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      let results = await manager.query(`
        WITH user_activity AS (
          SELECT
            (p.user->>'id')::bigint as user_id,
            COUNT(p.id) as post_count,
            MAX(p.ingested_at) as last_active,
            COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN nlp.id END) as positive_count,
            COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) as negative_count,
            COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN nlp.id END) as neutral_count,
            COUNT(DISTINCT nlp.id) as analyzed_count
          FROM weibo_posts p
          LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
          WHERE p.ingested_at >= $1
            AND p.ingested_at <= $2
            AND p.deleted_at IS NULL
            AND p.user->>'id' IS NOT NULL
          GROUP BY (p.user->>'id')::bigint
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
          COALESCE(ua.last_active, u.created_at::timestamptz) as last_active,
          CASE
            WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.6 THEN 'high'
            WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.3 THEN 'medium'
            ELSE 'low'
          END as risk_level
        FROM weibo_users u
        INNER JOIN user_activity ua ON ua.user_id = u.id
        ORDER BY ua.post_count DESC, u.followers_count DESC
        LIMIT 20
      `, [start, end]);

      if (results.length === 0) {
        results = await manager.query(`
          WITH user_activity AS (
            SELECT
              (p.user->>'id')::bigint as user_id,
              COUNT(p.id) as post_count,
              MAX(p.ingested_at) as last_active,
              COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN nlp.id END) as positive_count,
              COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END) as negative_count,
              COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN nlp.id END) as neutral_count,
              COUNT(DISTINCT nlp.id) as analyzed_count
            FROM weibo_posts p
            LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
            WHERE p.deleted_at IS NULL
              AND p.user->>'id' IS NOT NULL
            GROUP BY (p.user->>'id')::bigint
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
            COALESCE(ua.last_active, u.created_at::timestamptz) as last_active,
            CASE
              WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.6 THEN 'high'
              WHEN ua.analyzed_count > 0 AND (ua.negative_count::float / ua.analyzed_count) > 0.3 THEN 'medium'
              ELSE 'low'
            END as risk_level
          FROM weibo_users u
          INNER JOIN user_activity ua ON ua.user_id = u.id
          ORDER BY ua.last_active DESC, u.followers_count DESC
          LIMIT 20
        `);
      }

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
          lastActive: row.last_active
        };
      });

      return {
        users,
        total: users.length,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        hasMore: false
      };
    });
  }

  async getRiskLevels(timeRange: TimeRange = '7d') {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.USERS_RISK_LEVELS, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchRiskLevels(timeRange),
      CACHE_TTL.LONG
    );
  }

  private async fetchRiskLevels(timeRange: TimeRange): Promise<RiskLevelConfig[]> {
    return useEntityManager(async (manager) => {
      const { start, end } = getTimeRangeBoundaries(timeRange);

      const distribution = await manager.query(`
        WITH user_risk AS (
          SELECT
            (p.user->>'id')::bigint as user_id,
            COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END)::float /
              NULLIF(COUNT(DISTINCT nlp.id), 0) as negative_ratio
          FROM weibo_posts p
          LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
          WHERE p.ingested_at >= $1
            AND p.ingested_at <= $2
            AND p.deleted_at IS NULL
            AND p.user->>'id' IS NOT NULL
          GROUP BY (p.user->>'id')::bigint
          HAVING COUNT(DISTINCT nlp.id) > 0
        )
        SELECT
          CASE
            WHEN negative_ratio > 0.6 THEN 'high'
            WHEN negative_ratio > 0.3 THEN 'medium'
            ELSE 'low'
          END as risk_level,
          COUNT(*) as count
        FROM user_risk
        GROUP BY
          CASE
            WHEN negative_ratio > 0.6 THEN 'high'
            WHEN negative_ratio > 0.3 THEN 'medium'
            ELSE 'low'
          END
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

  async getStatistics(timeRange: TimeRange = '7d'): Promise<UserStatistics> {
    const cacheKey = CacheService.buildKey(CACHE_KEYS.USERS_STATS, timeRange);
    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchStatistics(timeRange),
      CACHE_TTL.LONG
    );
  }

  private async fetchStatistics(timeRange: TimeRange): Promise<UserStatistics> {
    return useEntityManager(async (manager) => {
      const current = getTimeRangeBoundaries(timeRange);
      const previous = getPreviousTimeRangeBoundaries(timeRange);

      const currentStats = await manager.query(`
        WITH user_risk AS (
          SELECT
            (p.user->>'id')::bigint as user_id,
            COUNT(DISTINCT nlp.id) as analyzed_count,
            COUNT(DISTINCT CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN nlp.id END)::float /
              NULLIF(COUNT(DISTINCT nlp.id), 0) as negative_ratio
          FROM weibo_posts p
          LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
          WHERE p.ingested_at >= $1
            AND p.ingested_at <= $2
            AND p.deleted_at IS NULL
            AND p.user->>'id' IS NOT NULL
          GROUP BY (p.user->>'id')::bigint
        )
        SELECT
          COUNT(DISTINCT user_id) as total_active,
          COUNT(DISTINCT CASE WHEN negative_ratio > 0.6 THEN user_id END) as high_risk,
          COUNT(DISTINCT CASE WHEN negative_ratio > 0.3 AND negative_ratio <= 0.6 THEN user_id END) as medium_risk,
          COUNT(DISTINCT CASE WHEN negative_ratio <= 0.3 THEN user_id END) as low_risk,
          AVG(negative_ratio * 100) as avg_risk_score
        FROM user_risk
        WHERE analyzed_count > 0
      `, [current.start, current.end]);

      const previousStats = await manager.query(`
        WITH user_risk AS (
          SELECT
            (p.user->>'id')::bigint as user_id,
            COUNT(DISTINCT nlp.id) as analyzed_count
          FROM weibo_posts p
          LEFT JOIN post_nlp_results nlp ON nlp.post_id = p.id
          WHERE p.ingested_at >= $1
            AND p.ingested_at <= $2
            AND p.deleted_at IS NULL
            AND p.user->>'id' IS NOT NULL
          GROUP BY (p.user->>'id')::bigint
        )
        SELECT COUNT(DISTINCT user_id) as total_active
        FROM user_risk
        WHERE analyzed_count > 0
      `, [previous.start, previous.end]);

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const activityStats = await manager.query(`
        SELECT
          COUNT(DISTINCT CASE WHEN p.ingested_at >= $1 THEN (p.user->>'id')::bigint END) as active_today,
          COUNT(DISTINCT CASE WHEN p.ingested_at >= $2 THEN (p.user->>'id')::bigint END) as active_week,
          COUNT(DISTINCT CASE WHEN p.ingested_at >= $3 THEN (p.user->>'id')::bigint END) as active_month
        FROM weibo_posts p
        WHERE p.ingested_at >= $3
          AND p.deleted_at IS NULL
          AND p.user->>'id' IS NOT NULL
      `, [oneDayAgo, sevenDaysAgo, thirtyDaysAgo]);

      const row = currentStats[0] || {};
      const prevRow = previousStats[0] || {};
      const actRow = activityStats[0] || {};

      const totalActive = parseInt(row.total_active) || 0;
      const prevTotalActive = parseInt(prevRow.total_active) || 0;
      const avgRiskScore = parseFloat(row.avg_risk_score) || 0;

      const totalGrowthRate = prevTotalActive > 0
        ? ((totalActive - prevTotalActive) / prevTotalActive) * 100
        : 0;

      return {
        total: totalActive,
        active: totalActive,
        suspended: 0,
        banned: 0,
        monitoring: parseInt(row.medium_risk) + parseInt(row.high_risk),
        riskDistribution: {
          low: parseInt(row.low_risk) || 0,
          medium: parseInt(row.medium_risk) || 0,
          high: parseInt(row.high_risk) || 0,
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
        }
      };
    });
  }
}
