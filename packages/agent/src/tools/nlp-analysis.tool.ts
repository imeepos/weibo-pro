import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { NLPAnalyzer } from '@sker/nlp';

/**
 * 对文本数据进行 NLP 分析（优先使用已有结果）
 */
export const createNLPAnalyzeTool = (analyzer: NLPAnalyzer) =>
  tool(
    async ({ posts }) => {
      const parsedPosts = JSON.parse(posts);

      if (!Array.isArray(parsedPosts)) {
        throw new Error('posts 必须是 JSON 数组');
      }

      const postsWithNLP = parsedPosts.filter((p) => p.nlp);
      const postsNeedAnalysis = parsedPosts.filter((p) => !p.nlp);

      const existingResults = postsWithNLP.map((p) => ({
        sentiment: p.nlp.sentiment,
        keywords: p.nlp.keywords,
        event: p.nlp.eventType,
      }));

      const newResults = await Promise.all(
        postsNeedAnalysis.slice(0, 100).map((post) =>
          analyzer.analyze({
            postId: post.id || String(Date.now()),
            content: post.text || post.content || '',
            comments: [],
            subComments: [],
            reposts: [],
          })
        )
      );

      const allResults = [...existingResults, ...newResults];

      const sentimentDist = {
        positive: 0,
        negative: 0,
        neutral: 0,
      };

      allResults.forEach((r) => {
        const sentiment = r.sentiment.overall as
          | 'positive'
          | 'negative'
          | 'neutral';
        sentimentDist[sentiment]++;
      });

      const total = allResults.length;

      const keywordMap = new Map<string, number>();
      allResults.forEach((r) => {
        r.keywords.forEach((kw: any) => {
          keywordMap.set(kw.keyword, (keywordMap.get(kw.keyword) || 0) + kw.weight);
        });
      });

      const topKeywords = Array.from(keywordMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([keyword, weight]) => ({ keyword, weight }));

      return JSON.stringify({
        total,
        analyzed: newResults.length,
        fromCache: existingResults.length,
        sentimentDistribution: {
          positive: ((sentimentDist.positive / total) * 100).toFixed(1) + '%',
          negative: ((sentimentDist.negative / total) * 100).toFixed(1) + '%',
          neutral: ((sentimentDist.neutral / total) * 100).toFixed(1) + '%',
        },
        topKeywords,
        details: allResults.slice(0, 5),
      });
    },
    {
      name: 'nlp_analyze',
      description: `对微博帖子进行批量 NLP 分析，提取情感倾向、关键词、事件类型。
【优化】优先使用数据库中已有的 NLP 分析结果，避免重复分析。
输入：query_posts 返回的帖子数据（JSON 字符串）
输出：情感分布统计、高频关键词、详细分析结果（前 5 条）、缓存命中情况`,
      schema: z.object({
        posts: z
          .string()
          .describe('帖子数据的 JSON 字符串，由 query_posts 工具返回'),
      }),
    }
  );
