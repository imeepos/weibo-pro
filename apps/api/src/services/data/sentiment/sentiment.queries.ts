/**
 * 情感分析数据查询
 */

import {
  PostNLPResultEntity,
  WeiboPostEntity,
} from '@sker/entities';
import type { TimeRange } from '../types';
import { getTimeGranularity } from './sentiment.utils';

// 查询情感计数
export async function fetchSentimentCounts(manager: any, start: Date, end: Date) {
  const result = await manager
    .getRepository(PostNLPResultEntity)
    .createQueryBuilder('nlp')
    .innerJoin(WeiboPostEntity, 'post', 'post.id = nlp.post_id')
    .select('COUNT(*)', 'total')
    .addSelect(
      "SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END)",
      'positive'
    )
    .addSelect(
      "SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END)",
      'negative'
    )
    .addSelect(
      "SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END)",
      'neutral'
    )
    .where('post.ingested_at >= :start', { start })
    .andWhere('post.ingested_at <= :end', { end })
    .andWhere('post.deleted_at IS NULL')
    .getRawOne();

  return {
    total: parseInt(result.total || '0'),
    positive: parseInt(result.positive || '0'),
    negative: parseInt(result.negative || '0'),
    neutral: parseInt(result.neutral || '0'),
  };
}

// 查询情感统计数据
export async function fetchSentimentStatistics(manager: any, start: Date, end: Date) {
  const result = await manager
    .getRepository(PostNLPResultEntity)
    .createQueryBuilder('nlp')
    .innerJoin(WeiboPostEntity, 'post', 'post.id = nlp.post_id')
    .select('COUNT(*)', 'total')
    .addSelect(
      "SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END)",
      'positive_count'
    )
    .addSelect(
      "SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END)",
      'negative_count'
    )
    .addSelect(
      "SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END)",
      'neutral_count'
    )
    .addSelect(
      "AVG((nlp.sentiment->>'positive_prob')::numeric)",
      'positive_avg'
    )
    .addSelect(
      "AVG((nlp.sentiment->>'negative_prob')::numeric)",
      'negative_avg'
    )
    .addSelect(
      "AVG((nlp.sentiment->>'neutral_prob')::numeric)",
      'neutral_avg'
    )
    .addSelect(
      "AVG((nlp.sentiment->>'confidence')::numeric)",
      'confidence_avg'
    )
    .where('post.ingested_at >= :start', { start })
    .andWhere('post.ingested_at <= :end', { end })
    .andWhere('post.deleted_at IS NULL')
    .getRawOne();

  return result;
}

// 查询关键词云
export async function fetchKeywords(manager: any, start: Date, end: Date, limit: number) {
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
    GROUP BY keyword_elem->>'keyword', keyword_elem->>'sentiment'
    ORDER BY count DESC
    LIMIT $3
  `, [start, end, limit]);

  return results.map((row: any) => ({
    keyword: row.keyword,
    count: parseInt(row.count),
    sentiment: row.sentiment,
    weight: parseFloat(row.weight || '0'),
  }));
}

// 查询热点话题
export async function fetchHotTopics(manager: any, start: Date, end: Date, limit: number) {
  const results = await manager.query(`
    SELECT
      keyword_elem->>'keyword' as topic,
      COUNT(DISTINCT nlp.post_id) as post_count,
      COUNT(DISTINCT post.user_id) as user_count,
      keyword_elem->>'sentiment' as sentiment,
      AVG((keyword_elem->>'weight')::numeric) as heat_score
    FROM post_nlp_results nlp
    INNER JOIN weibo_posts post ON post.id = nlp.post_id
    CROSS JOIN jsonb_array_elements(nlp.keywords) as keyword_elem
    WHERE post.ingested_at >= $1
      AND post.ingested_at <= $2
      AND post.deleted_at IS NULL
    GROUP BY keyword_elem->>'keyword', keyword_elem->>'sentiment'
    ORDER BY post_count DESC
    LIMIT $3
  `, [start, end, limit]);

  return results.map((row: any, index: number) => ({
    id: `topic_${index + 1}`,
    topic: row.topic,
    sentiment: row.sentiment,
    heat: Math.round(parseFloat(row.heat_score || '0') * 100),
    posts: parseInt(row.post_count),
    users: parseInt(row.user_count),
  }));
}

// 查询时间序列
export async function fetchTimeSeries(manager: any, timeRange: TimeRange, start: Date, end: Date) {
  const granularity = getTimeGranularity(timeRange);

  const results = await manager.query(`
    SELECT
      DATE_TRUNC($1, post.ingested_at) as time_bucket,
      COUNT(*) as total,
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

  return results.map((row: any) => ({
    timestamp: row.time_bucket,
    positive: parseInt(row.positive),
    negative: parseInt(row.negative),
    neutral: parseInt(row.neutral),
    total: parseInt(row.total),
  }));
}

// 查询地理位置分布
export async function fetchLocations(manager: any, start: Date, end: Date) {
  const results = await manager.query(`
    SELECT
      COALESCE(
        NULLIF(post.region_name, ''),
        NULLIF(u.location, ''),
        '未知'
      ) as region,
      COUNT(*) as total,
      SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END) as negative,
      SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END) as neutral
    FROM post_nlp_results nlp
    INNER JOIN weibo_posts post ON post.id = nlp.post_id
    LEFT JOIN weibo_users u ON u.id = post.user_id
    WHERE post.ingested_at >= $1
      AND post.ingested_at <= $2
      AND post.deleted_at IS NULL
    GROUP BY region
    ORDER BY total DESC
    LIMIT 20
  `, [start, end]);

  return results.map((row: any) => ({
    region: (row.region || '').replace('发布于', '').trim(),
    positive: parseInt(row.positive),
    negative: parseInt(row.negative),
    neutral: parseInt(row.neutral),
    total: parseInt(row.total),
  }));
}

// 查询最新帖子
export async function fetchRecentPosts(manager: any, start: Date, end: Date, limit: number) {
  const results = await manager
    .getRepository(PostNLPResultEntity)
    .createQueryBuilder('nlp')
    .innerJoin(WeiboPostEntity, 'post', 'post.id = nlp.post_id')
    .leftJoin('weibo_users', 'u', 'u.id = post.user_id')
    .select('post.id', 'id')
    .addSelect('post.text', 'content')
    .addSelect("nlp.sentiment->>'overall'", 'sentiment')
    .addSelect("nlp.sentiment->>'confidence'", 'confidence')
    .addSelect('u.screen_name', 'author')
    .addSelect('post.attitudes_count', 'likes')
    .addSelect('post.comments_count', 'comments')
    .addSelect('post.ingested_at', 'timestamp')
    .where('post.ingested_at >= :start', { start })
    .andWhere('post.ingested_at <= :end', { end })
    .andWhere('post.deleted_at IS NULL')
    .orderBy('post.ingested_at', 'DESC')
    .limit(limit)
    .getRawMany();

  return results.map((row: any) => ({
    id: row.id,
    content: row.content,
    sentiment: row.sentiment,
    confidence: parseFloat(row.confidence || '0'),
    author: row.author || '未知用户',
    likes: row.likes || 0,
    comments: row.comments || 0,
    timestamp: row.timestamp,
  }));
}

// 搜索帖子
export async function fetchSearchResults(manager: any, keyword: string, start: Date, end: Date) {
  // 搜索匹配的帖子
  const posts = await manager.query(`
    SELECT
      post.id,
      post.text as content,
      nlp.sentiment->>'overall' as sentiment,
      nlp.sentiment->>'confidence' as confidence,
      u.screen_name as author,
      post.ingested_at as timestamp
    FROM post_nlp_results nlp
    INNER JOIN weibo_posts post ON post.id = nlp.post_id
    LEFT JOIN weibo_users u ON u.id = post.user_id
    WHERE (post.text ILIKE $1 OR post.text_raw ILIKE $1)
      AND post.ingested_at >= $2
      AND post.ingested_at <= $3
      AND post.deleted_at IS NULL
    ORDER BY post.ingested_at DESC
    LIMIT 50
  `, [`%${keyword}%`, start, end]);

  // 统计情感分布
  const stats = await manager.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN nlp.sentiment->>'overall' = 'positive' THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN nlp.sentiment->>'overall' = 'negative' THEN 1 ELSE 0 END) as negative,
      SUM(CASE WHEN nlp.sentiment->>'overall' = 'neutral' THEN 1 ELSE 0 END) as neutral
    FROM post_nlp_results nlp
    INNER JOIN weibo_posts post ON post.id = nlp.post_id
    WHERE (post.text ILIKE $1 OR post.text_raw ILIKE $1)
      AND post.ingested_at >= $2
      AND post.ingested_at <= $3
      AND post.deleted_at IS NULL
  `, [`%${keyword}%`, start, end]);

  const total = parseInt(stats[0]?.total || '0');

  return {
    keyword,
    totalResults: total,
    sentimentDistribution: {
      positive: total > 0 ? Math.round((parseInt(stats[0]?.positive || '0') / total) * 100) : 0,
      negative: total > 0 ? Math.round((parseInt(stats[0]?.negative || '0') / total) * 100) : 0,
      neutral: total > 0 ? Math.round((parseInt(stats[0]?.neutral || '0') / total) * 100) : 0,
    },
    posts: posts.map((row: any) => ({
      id: row.id,
      content: row.content,
      sentiment: row.sentiment,
      confidence: parseFloat(row.confidence || '0'),
      author: row.author || '未知用户',
      timestamp: row.timestamp,
    })),
  };
}

// 查询情感极化数据
export async function fetchPolarizationCounts(manager: any, start: Date, end: Date) {
  return manager.query(`
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
}
