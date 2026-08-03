import { useEntityManager } from '@sker/entities';
import { getTimeRangeBoundaries } from '../time-range.utils';
import { getTimeGranularity, formatTimeLabel } from './time-granularity';
import { toInt } from '../../../utils/type-converter';
import type { TimeRange } from '../types';
import type { ChartData } from './types';

/**
 * 查询帖子数量时间序列
 */
export async function fetchPostCountSeries(timeRange: TimeRange): Promise<ChartData> {
  return useEntityManager(async (manager) => {
    const { start, end } = getTimeRangeBoundaries(timeRange);
    const granularity = getTimeGranularity(timeRange);

    const results = await manager.query(`
      SELECT
        DATE_TRUNC($1, post.ingested_at) as time_bucket,
        COUNT(*) as count
      FROM weibo_posts post
      WHERE post.ingested_at >= $2
        AND post.ingested_at <= $3
        AND post.deleted_at IS NULL
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `, [granularity, start, end]);

    const categories = results.map((r: any) => formatTimeLabel(r.time_bucket, granularity));
    const data = results.map((r: any) => toInt(r.count));

    return {
      categories,
      series: [{ name: '帖子数量', data }]
    };
  });
}
