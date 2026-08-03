import { useEntityManager } from '@sker/entities';
import { getTimeRangeBoundaries } from '../time-range.utils';
import { toInt } from '../../../utils/type-converter';
import type { TimeRange } from '../types';
import type { SentimentSummary } from './types';

/**
 * 查询情感汇总数据（正面/负面/中性/总数）
 */
export async function fetchSentimentData(timeRange: TimeRange): Promise<SentimentSummary> {
  return useEntityManager(async (manager) => {
    const { start, end } = getTimeRangeBoundaries(timeRange);

    const result = await manager.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END) as negative,
        SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END) as neutral
      FROM post_nlp_results nlp
      INNER JOIN weibo_posts post ON post.id = nlp.post_id
      WHERE post.ingested_at >= $1
        AND post.ingested_at <= $2
        AND post.deleted_at IS NULL
    `, [start, end]);

    const row = result[0];
    const total = toInt(row.total);
    const positive = toInt(row.positive);
    const negative = toInt(row.negative);
    const neutral = toInt(row.neutral);

    return {
      positive,
      negative,
      neutral,
      total
    };
  });
}
