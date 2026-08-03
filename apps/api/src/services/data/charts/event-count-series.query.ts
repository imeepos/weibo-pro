import { useEntityManager } from '@sker/entities';
import { getTimeRangeBoundaries } from '../time-range.utils';
import { getTimeGranularity, formatTimeLabel } from './time-granularity';
import { toInt } from '../../../utils/type-converter';
import type { TimeRange } from '../types';
import type { ChartData } from './types';

/**
 * 查询事件数量时间序列
 */
export async function fetchEventCountSeries(timeRange: TimeRange): Promise<ChartData> {
  return useEntityManager(async (manager) => {
    const { start, end } = getTimeRangeBoundaries(timeRange);
    const granularity = getTimeGranularity(timeRange);

    const results = await manager.query(`
      SELECT
        DATE_TRUNC($1, e.created_at) as time_bucket,
        COUNT(*) as count
      FROM events e
      WHERE e.created_at >= $2
        AND e.created_at <= $3
        AND e.deleted_at IS NULL
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `, [granularity, start, end]);

    const categories = results.map((r: any) => formatTimeLabel(r.time_bucket, granularity));
    const data = results.map((r: any) => toInt(r.count));

    return {
      categories,
      series: [{ name: '事件数量', data }]
    };
  });
}
