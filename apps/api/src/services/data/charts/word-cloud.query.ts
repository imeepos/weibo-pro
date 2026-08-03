import { useEntityManager } from '@sker/entities';
import { getTimeRangeBoundaries } from '../time-range.utils';
import { toInt, toFloat } from '../../../utils/type-converter';
import type { TimeRange } from '../types';
import type { WordCloudItem } from './types';

/**
 * 从 NLP 结果提取关键词并聚合，生成词云数据
 */
export async function fetchWordCloud(
  timeRange: TimeRange,
  limit: number,
  sentiment?: 'positive' | 'negative' | 'neutral'
): Promise<WordCloudItem[]> {
  return useEntityManager(async (manager) => {
    const { start, end } = getTimeRangeBoundaries(timeRange);

    // 从 NLP 结果提取关键词并聚合
    const results = await manager.query(`
      SELECT
        keyword_elem->>'keyword' as keyword,
        keyword_elem->>'sentiment' as sentiment,
        COUNT(*) as count,
        AVG((keyword_elem->>'weight')::numeric) as weight
      FROM post_nlp_results nlp
      INNER JOIN weibo_posts post ON post.id = nlp.post_id
      CROSS JOIN jsonb_array_elements(nlp.keywords) as keyword_elem
      WHERE post.ingested_at >= $1
        AND post.ingested_at <= $2
        AND post.deleted_at IS NULL
        ${sentiment ? `AND keyword_elem->>'sentiment' = $3` : ''}
      GROUP BY keyword_elem->>'keyword', keyword_elem->>'sentiment'
      ORDER BY count DESC
      LIMIT $${sentiment ? 4 : 3}
    `, sentiment ? [start, end, sentiment, limit] : [start, end, limit]);

    return results.map((row: any) => ({
      keyword: row.keyword,
      count: toInt(row.count),
      sentiment: row.sentiment,
      weight: toFloat(row.weight),
    }));
  });
}
