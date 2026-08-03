/**
 * 重新计算统计：聚合、批量写入与汇总工具模块。
 */
import { HourlyStats } from './recalculate-statistics.queries';

export function mergeStatistics(...statsArrays: HourlyStats[][]): HourlyStats[] {
  const statsMap = new Map<string, HourlyStats>();

  for (const statsArray of statsArrays) {
    for (const stat of statsArray) {
      const key = `${stat.event_id}_${stat.year}_${stat.month}_${stat.day}_${stat.hour}`;
      const existing = statsMap.get(key);

      if (existing) {
        existing.post_count = (existing.post_count || 0) + (stat.post_count || 0);
        existing.comment_count = (existing.comment_count || 0) + (stat.comment_count || 0);
        existing.like_count = (existing.like_count || 0) + (stat.like_count || 0);
        existing.repost_count = (existing.repost_count || 0) + (stat.repost_count || 0);
        existing.user_count = (existing.user_count || 0) + (stat.user_count || 0);
      } else {
        statsMap.set(key, { ...stat });
      }
    }
  }

  return Array.from(statsMap.values());
}

export async function batchUpsertStatistics(
  manager: any,
  stats: HourlyStats[],
  batchSize: number
): Promise<void> {
  for (let i = 0; i < stats.length; i += batchSize) {
    const batch = stats.slice(i, i + batchSize);

    for (const stat of batch) {
      const hotness = (stat.post_count || 0) * 1 + (stat.comment_count || 0) * 2 + (stat.repost_count || 0) * 3 + (stat.like_count || 0) * 0.5;

      await manager.query(`
        INSERT INTO event_hourly_statistics (
          event_id, year, month, day, hour,
          post_count, comment_count, like_count, repost_count, user_count, hotness
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (event_id, year, month, day, hour)
        DO UPDATE SET
          post_count = EXCLUDED.post_count,
          comment_count = EXCLUDED.comment_count,
          like_count = EXCLUDED.like_count,
          repost_count = EXCLUDED.repost_count,
          user_count = EXCLUDED.user_count,
          hotness = EXCLUDED.hotness,
          updated_at = CURRENT_TIMESTAMP
      `, [
        stat.event_id,
        stat.year,
        stat.month,
        stat.day,
        stat.hour,
        stat.post_count || 0,
        stat.comment_count || 0,
        stat.like_count || 0,
        stat.repost_count || 0,
        stat.user_count || 0,
        hotness
      ]);
    }
  }
}

export function calculateTotalStatistics(stats: HourlyStats[]) {
  return stats.reduce((acc, stat) => ({
    postCount: acc.postCount + (stat.post_count || 0),
    commentCount: acc.commentCount + (stat.comment_count || 0),
    likeCount: acc.likeCount + (stat.like_count || 0),
    repostCount: acc.repostCount + (stat.repost_count || 0),
    uniqueUserCount: acc.uniqueUserCount + (stat.user_count || 0)
  }), {
    postCount: 0,
    commentCount: 0,
    likeCount: 0,
    repostCount: 0,
    uniqueUserCount: 0
  });
}
