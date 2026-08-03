import { useEntityManager } from '@sker/entities';
import { getTimeRangeBoundaries } from '../time-range.utils';
import { toInt } from '../../../utils/type-converter';
import type { TimeRange } from '../types';
import type { ChartData } from './types';

/**
 * 查询发帖用户的性别分布
 */
export async function fetchGenderDistribution(timeRange: TimeRange): Promise<ChartData> {
  return useEntityManager(async (manager) => {
    const { start, end } = getTimeRangeBoundaries(timeRange);

    // 查询发帖用户的性别分布
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
        CASE
          WHEN u.gender = 'm' THEN '男性'
          WHEN u.gender = 'f' THEN '女性'
          ELSE '未知'
        END as gender,
        COUNT(*) as count
      FROM weibo_users u
      INNER JOIN user_posts up ON up.uid = u.id
      GROUP BY u.gender
      ORDER BY count DESC
    `, [start, end]);

    const genderOrder = ['男性', '女性', '未知'];
    const genderMap = new Map<string, number>(results.map((r: any) => [r.gender, toInt(r.count)]));

    const categories = genderOrder;
    const data: number[] = genderOrder.map(g => genderMap.get(g) ?? 0);

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
