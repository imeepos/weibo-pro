import { EntityManager } from 'typeorm';
import { OverviewStatistics, StatisticsPeriod } from '../overview-statistics.entity';
import { StatisticsProgress } from '../statistics-progress.entity';

export class OverviewStatisticsQueries {
  /**
   * 增量统计小时级数据
   */
  static async incrementalHourlyStats(manager: EntityManager): Promise<number> {
    const progressKey = 'overview_hourly';
    let progress = await manager.findOne(StatisticsProgress, {
      where: { relationType: progressKey },
    });

    if (!progress) {
      progress = manager.create(StatisticsProgress, {
        relationType: progressKey,
        lastProcessedId: '0',
      });
      await manager.save(progress);
    }

    const lastProcessedTime = progress.lastProcessedAt || new Date('2020-01-01');

    const sql = `
      WITH hourly_periods AS (
        SELECT generate_series(
          date_trunc('hour', $1::timestamp),
          date_trunc('hour', NOW()),
          '1 hour'::interval
        ) as period_start
      ),
      event_stats AS (
        SELECT
          date_trunc('hour', COALESCE(e.occurred_at, e.created_at)) as period_start,
          COUNT(*) as event_count
        FROM events e
        WHERE COALESCE(e.occurred_at, e.created_at) >= $1
          AND e.deleted_at IS NULL
          AND e.status = 'active'
        GROUP BY date_trunc('hour', COALESCE(e.occurred_at, e.created_at))
      ),
      post_stats AS (
        SELECT
          date_trunc('hour', p.ingested_at) as period_start,
          COUNT(*) as post_count,
          COUNT(DISTINCT CAST(p."user"->>'id' AS bigint)) as user_count
        FROM weibo_posts p
        WHERE p.ingested_at >= $1
          AND p.deleted_at IS NULL
        GROUP BY date_trunc('hour', p.ingested_at)
      ),
      interaction_stats AS (
        SELECT
          date_trunc('hour', ingested_at) as period_start,
          COUNT(*) as comment_count
        FROM weibo_comments
        WHERE ingested_at >= $1
        GROUP BY date_trunc('hour', ingested_at)
      ),
      like_stats AS (
        SELECT
          date_trunc('hour', created_at) as period_start,
          COUNT(*) as like_count
        FROM weibo_likes
        WHERE created_at >= $1
        GROUP BY date_trunc('hour', created_at)
      ),
      repost_stats AS (
        SELECT
          date_trunc('hour', ingested_at) as period_start,
          COUNT(*) as repost_count
        FROM weibo_reposts
        WHERE ingested_at >= $1
        GROUP BY date_trunc('hour', ingested_at)
      ),
      aggregated AS (
        SELECT
          hp.period_start,
          COALESCE(es.event_count, 0) as event_count,
          COALESCE(ps.post_count, 0) as post_count,
          COALESCE(ps.user_count, 0) as user_count,
          COALESCE(ins.comment_count, 0) as comment_count,
          COALESCE(ls.like_count, 0) as like_count,
          COALESCE(rs.repost_count, 0) as repost_count,
          COALESCE(ins.comment_count, 0) + COALESCE(ls.like_count, 0) + COALESCE(rs.repost_count, 0) as interaction_count
        FROM hourly_periods hp
        LEFT JOIN event_stats es ON hp.period_start = es.period_start
        LEFT JOIN post_stats ps ON hp.period_start = ps.period_start
        LEFT JOIN interaction_stats ins ON hp.period_start = ins.period_start
        LEFT JOIN like_stats ls ON hp.period_start = ls.period_start
        LEFT JOIN repost_stats rs ON hp.period_start = rs.period_start
      )
      INSERT INTO overview_statistics (
        period,
        period_start,
        event_count,
        post_count,
        user_count,
        comment_count,
        like_count,
        repost_count,
        interaction_count
      )
      SELECT
        'hourly' as period,
        period_start,
        event_count,
        post_count,
        user_count,
        comment_count,
        like_count,
        repost_count,
        interaction_count
      FROM aggregated
      ON CONFLICT (period, period_start)
      DO UPDATE SET
        event_count = EXCLUDED.event_count,
        post_count = EXCLUDED.post_count,
        user_count = EXCLUDED.user_count,
        comment_count = EXCLUDED.comment_count,
        like_count = EXCLUDED.like_count,
        repost_count = EXCLUDED.repost_count,
        interaction_count = EXCLUDED.interaction_count,
        updated_at = NOW()
      RETURNING period_start
    `;

    const result = await manager.query(sql, [lastProcessedTime]);

    const processedCount = result.length;

    if (processedCount > 0) {
      // 使用实际处理的最大时间，而不是当前系统时间
      const maxPeriodStart = result.reduce((max: Date, row: any) => {
        const periodStart = new Date(row.period_start);
        return periodStart > max ? periodStart : max;
      }, new Date(0));

      // 加1小时，表示已经处理到这个小时的结束
      progress.lastProcessedAt = new Date(maxPeriodStart.getTime() + 60 * 60 * 1000);
      progress.processedCount = processedCount;
      await manager.save(progress);
    }

    return processedCount;
  }

  /**
   * 增量统计天级数据
   */
  static async incrementalDailyStats(manager: EntityManager): Promise<number> {
    const progressKey = 'overview_daily';
    let progress = await manager.findOne(StatisticsProgress, {
      where: { relationType: progressKey },
    });

    if (!progress) {
      progress = manager.create(StatisticsProgress, {
        relationType: progressKey,
        lastProcessedId: '0',
      });
      await manager.save(progress);
    }

    const lastProcessedTime = progress.lastProcessedAt || new Date('2020-01-01');

    const sql = `
      WITH daily_periods AS (
        SELECT generate_series(
          date_trunc('day', $1::timestamp),
          date_trunc('day', NOW()),
          '1 day'::interval
        ) as period_start
      ),
      event_stats AS (
        SELECT
          date_trunc('day', COALESCE(e.occurred_at, e.created_at)) as period_start,
          COUNT(*) as event_count
        FROM events e
        WHERE COALESCE(e.occurred_at, e.created_at) >= $1
          AND e.deleted_at IS NULL
          AND e.status = 'active'
        GROUP BY date_trunc('day', COALESCE(e.occurred_at, e.created_at))
      ),
      post_stats AS (
        SELECT
          date_trunc('day', p.ingested_at) as period_start,
          COUNT(*) as post_count,
          COUNT(DISTINCT CAST(p."user"->>'id' AS bigint)) as user_count
        FROM weibo_posts p
        WHERE p.ingested_at >= $1
          AND p.deleted_at IS NULL
        GROUP BY date_trunc('day', p.ingested_at)
      ),
      interaction_stats AS (
        SELECT
          date_trunc('day', ingested_at) as period_start,
          COUNT(*) as comment_count
        FROM weibo_comments
        WHERE ingested_at >= $1
        GROUP BY date_trunc('day', ingested_at)
      ),
      like_stats AS (
        SELECT
          date_trunc('day', created_at) as period_start,
          COUNT(*) as like_count
        FROM weibo_likes
        WHERE created_at >= $1
        GROUP BY date_trunc('day', created_at)
      ),
      repost_stats AS (
        SELECT
          date_trunc('day', ingested_at) as period_start,
          COUNT(*) as repost_count
        FROM weibo_reposts
        WHERE ingested_at >= $1
        GROUP BY date_trunc('day', ingested_at)
      ),
      aggregated AS (
        SELECT
          dp.period_start,
          COALESCE(es.event_count, 0) as event_count,
          COALESCE(ps.post_count, 0) as post_count,
          COALESCE(ps.user_count, 0) as user_count,
          COALESCE(ins.comment_count, 0) as comment_count,
          COALESCE(ls.like_count, 0) as like_count,
          COALESCE(rs.repost_count, 0) as repost_count,
          COALESCE(ins.comment_count, 0) + COALESCE(ls.like_count, 0) + COALESCE(rs.repost_count, 0) as interaction_count
        FROM daily_periods dp
        LEFT JOIN event_stats es ON dp.period_start = es.period_start
        LEFT JOIN post_stats ps ON dp.period_start = ps.period_start
        LEFT JOIN interaction_stats ins ON dp.period_start = ins.period_start
        LEFT JOIN like_stats ls ON dp.period_start = ls.period_start
        LEFT JOIN repost_stats rs ON dp.period_start = rs.period_start
      )
      INSERT INTO overview_statistics (
        period,
        period_start,
        event_count,
        post_count,
        user_count,
        comment_count,
        like_count,
        repost_count,
        interaction_count
      )
      SELECT
        'daily' as period,
        period_start,
        event_count,
        post_count,
        user_count,
        comment_count,
        like_count,
        repost_count,
        interaction_count
      FROM aggregated
      ON CONFLICT (period, period_start)
      DO UPDATE SET
        event_count = EXCLUDED.event_count,
        post_count = EXCLUDED.post_count,
        user_count = EXCLUDED.user_count,
        comment_count = EXCLUDED.comment_count,
        like_count = EXCLUDED.like_count,
        repost_count = EXCLUDED.repost_count,
        interaction_count = EXCLUDED.interaction_count,
        updated_at = NOW()
      RETURNING period_start
    `;

    const result = await manager.query(sql, [lastProcessedTime]);

    const processedCount = result.length;

    if (processedCount > 0) {
      // 使用实际处理的最大时间，而不是当前系统时间
      const maxPeriodStart = result.reduce((max: Date, row: any) => {
        const periodStart = new Date(row.period_start);
        return periodStart > max ? periodStart : max;
      }, new Date(0));

      // 加1天，表示已经处理到这一天的结束
      progress.lastProcessedAt = new Date(maxPeriodStart.getTime() + 24 * 60 * 60 * 1000);
      progress.processedCount = processedCount;
      await manager.save(progress);
    }

    return processedCount;
  }

  /**
   * 执行所有增量统计
   */
  static async runIncrementalStats(manager: EntityManager): Promise<{ hourly: number; daily: number }> {
    const hourlyCount = await this.incrementalHourlyStats(manager);
    const dailyCount = await this.incrementalDailyStats(manager);

    return {
      hourly: hourlyCount,
      daily: dailyCount,
    };
  }
}
