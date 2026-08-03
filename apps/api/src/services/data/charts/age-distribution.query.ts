import { useEntityManager } from '@sker/entities';
import { getTimeRangeBoundaries } from '../time-range.utils';
import { toInt } from '../../../utils/type-converter';
import type { TimeRange } from '../types';
import type { ChartData } from './types';

/**
 * 查询发帖用户的年龄（账号年龄）分布
 */
export async function fetchAgeDistribution(timeRange: TimeRange): Promise<ChartData> {
  return useEntityManager(async (manager) => {
    const { start, end } = getTimeRangeBoundaries(timeRange);

    // 查询发帖用户的年龄分布
    // 根据微博用户注册时间估算账号年龄
    const results = await manager.query(`
      WITH user_posts AS (
        SELECT DISTINCT post.user_id as uid
        FROM weibo_posts post
        WHERE post.ingested_at >= $1
          AND post.ingested_at <= $2
          AND post.deleted_at IS NULL
          AND post.user_id IS NOT NULL
      ),
      user_ages AS (
        SELECT
          u.id,
          EXTRACT(YEAR FROM AGE(NOW(), u.created_at::timestamp))::integer as account_age
        FROM weibo_users u
        INNER JOIN user_posts up ON up.uid = u.id
        WHERE u.created_at IS NOT NULL
      )
      SELECT
        CASE
          WHEN account_age < 2 THEN '0-2年'
          WHEN account_age < 5 THEN '2-5年'
          WHEN account_age < 8 THEN '5-8年'
          WHEN account_age < 10 THEN '8-10年'
          ELSE '10年以上'
        END as age_range,
        COUNT(*) as count
      FROM user_ages
      GROUP BY age_range
      ORDER BY
        CASE age_range
          WHEN '0-2年' THEN 1
          WHEN '2-5年' THEN 2
          WHEN '5-8年' THEN 3
          WHEN '8-10年' THEN 4
          ELSE 5
        END
    `, [start, end]);

    const categories = results.map((r: any) => r.age_range);
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
