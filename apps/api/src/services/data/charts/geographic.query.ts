import { useEntityManager } from '@sker/entities';
import { getTimeRangeBoundaries } from '../time-range.utils';
import { toInt } from '../../../utils/type-converter';
import type { TimeRange } from '../types';
import type { ChartData } from './types';

/**
 * 查询发帖用户的地理位置分布
 */
export async function fetchGeographic(timeRange: TimeRange): Promise<ChartData> {
  return useEntityManager(async (manager) => {
    const { start, end } = getTimeRangeBoundaries(timeRange);

    // 查询发帖用户的地理位置分布
    const results = await manager.query(`
      WITH user_posts AS (
        SELECT DISTINCT post.user_id as uid
        FROM weibo_posts post
        WHERE post.ingested_at >= $1
          AND post.ingested_at <= $2
          AND post.deleted_at IS NULL
          AND post.user_id IS NOT NULL
      )
      SELECT
        COALESCE(NULLIF(u.province, ''), NULLIF(u.city, ''), NULLIF(u.location, ''), '未知') as location,
        COUNT(*) as count
      FROM weibo_users u
      INNER JOIN user_posts up ON up.uid = u.id
      GROUP BY COALESCE(NULLIF(u.province, ''), NULLIF(u.city, ''), NULLIF(u.location, ''), '未知')
      HAVING COUNT(*) > 0
      ORDER BY count DESC
      LIMIT 20
    `, [start, end]);

    const categories = results.map((r: any) => r.location);
    const data = results.map((r: any) => toInt(r.count));

    return {
      categories,
      series: [
        {
          name: '用户数量',
          data
        }
      ]
    };
  });
}
