import { useEntityManager } from '@sker/entities';
import { getTimeRangeBoundaries } from '../time-range.utils';
import { getTimeGranularity, formatTimeLabel } from './time-granularity';
import { toInt } from '../../../utils/type-converter';
import type { Logger } from '@sker/core';
import type { TimeRange } from '../types';
import type { ChartData } from './types';

/**
 * 查询情感趋势
 * 优先从统计表查询，降级到 NLP 结果表
 */
export async function fetchSentimentTrend(timeRange: TimeRange, logger?: Logger): Promise<ChartData> {
  return useEntityManager(async (manager) => {
    const { start, end } = getTimeRangeBoundaries(timeRange);
    const granularity = getTimeGranularity(timeRange);

    let chartData: ChartData;
    try {
      chartData = await fetchSentimentTrendFromStatistics(manager, start, end, granularity, logger);
    } catch (error) {
      logger?.warn('Statistics table query failed, fallback to NLP results', error);
      chartData = await fetchSentimentTrendFromNLPResults(manager, start, end, granularity, logger);
    }

    return chartData;
  });
}

async function fetchSentimentTrendFromStatistics(
  manager: any,
  start: Date,
  end: Date,
  granularity: string,
  logger?: Logger
): Promise<ChartData> {
  // 从 EventHourlyStatisticsEntity 查询情感趋势
  const results = await manager.query(`
    SELECT
      DATE_TRUNC($1, make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0)) as time_bucket,
      SUM(stats.sentiment_positive) as positive,
      SUM(stats.sentiment_negative) as negative,
      SUM(stats.sentiment_neutral) as neutral
    FROM event_hourly_statistics stats
    WHERE make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) >= $2
      AND make_timestamp(stats.year, stats.month, stats.day, stats.hour, 0, 0) < $3
      AND stats.nlp_count > 0
    GROUP BY time_bucket
    ORDER BY time_bucket ASC
  `, [granularity, start, end]);

  logger?.info('Sentiment trend from statistics completed', { resultCount: results.length });

  const categories = results.map((r: any) => formatTimeLabel(r.time_bucket, granularity));
  const positiveData = results.map((r: any) => toInt(r.positive, 0));
  const negativeData = results.map((r: any) => toInt(r.negative, 0));
  const neutralData = results.map((r: any) => toInt(r.neutral, 0));

  return {
    categories,
    series: [
      { name: '正面', data: positiveData },
      { name: '负面', data: negativeData },
      { name: '中性', data: neutralData }
    ]
  };
}

async function fetchSentimentTrendFromNLPResults(
  manager: any,
  start: Date,
  end: Date,
  granularity: string,
  logger?: Logger
): Promise<ChartData> {
  // 从 PostNLPResultEntity 聚合情感趋势（降级备选）
  const results = await manager.query(`
    SELECT
      DATE_TRUNC($1, post.ingested_at) as time_bucket,
      SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END) as negative,
      SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END) as neutral
    FROM post_nlp_results nlp
    INNER JOIN weibo_posts post ON post.id = nlp.post_id
    WHERE post.ingested_at >= $2
      AND post.ingested_at <= $3
      AND post.deleted_at IS NULL
    GROUP BY time_bucket
    ORDER BY time_bucket ASC
  `, [granularity, start, end]);

  logger?.info('Sentiment trend from NLP results completed', { resultCount: results.length });

  const categories = results.map((r: any) => formatTimeLabel(r.time_bucket, granularity));
  const positiveData = results.map((r: any) => toInt(r.positive));
  const negativeData = results.map((r: any) => toInt(r.negative));
  const neutralData = results.map((r: any) => toInt(r.neutral));

  return {
    categories,
    series: [
      { name: '正面', data: positiveData },
      { name: '负面', data: negativeData },
      { name: '中性', data: neutralData }
    ]
  };
}
