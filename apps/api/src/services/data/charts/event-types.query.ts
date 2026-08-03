import { useEntityManager } from '@sker/entities';
import { getTimeRangeBoundaries } from '../time-range.utils';
import { toInt } from '../../../utils/type-converter';
import type { Logger } from '@sker/core';
import type { TimeRange } from '../types';
import type { ChartData } from './types';

/**
 * 查询事件分类统计
 */
export async function fetchEventTypes(timeRange: TimeRange, logger: Logger): Promise<ChartData> {
  return useEntityManager(async (manager) => {
    const { start, end } = getTimeRangeBoundaries(timeRange);

    // 查询事件分类统计
    const results = await manager.query(`
      SELECT
        COALESCE(c.name, '未分类') as category,
        COUNT(*) as count
      FROM events e
      LEFT JOIN event_categories c ON c.id = e.category_id
      WHERE e.created_at >= $1
        AND e.created_at <= $2
        AND e.deleted_at IS NULL
      GROUP BY c.name
      ORDER BY count DESC
    `, [start, end]);

    logger.info('Event types fetched', {
      timeRange,
      start,
      end,
      resultCount: results.length,
      results: results.map((r: any) => ({ category: r.category, count: r.count }))
    });

    const categories = results.map((r: any) => r.category);
    const data = results.map((r: any) => toInt(r.count));

    return {
      categories,
      series: [
        {
          name: '事件数量',
          data
        }
      ]
    };
  });
}
