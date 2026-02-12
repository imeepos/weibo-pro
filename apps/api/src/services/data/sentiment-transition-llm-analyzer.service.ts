import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import { WeiboPostEntity } from '@sker/entities';
import { SENTIMENT_TRANSITION_CONFIG } from './events/sentiment-transition-constants';
import type { TurningPoint } from '@sker/sdk';
import { useLlmModel } from '@sker/workflow-run';

/**
 * LLM 分析器服务
 * 使用 LLM 大模型分析转折点，提取关键词和触发帖子
 */
@Injectable({ providedIn: 'root' })
export class SentimentTransitionLLMAnalyzerService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) { }

  /**
   * 使用 LLM 分析转折点，提取关键词和触发帖子
   */
  async analyzeTurningPoint(
    eventId: string,
    turningPoint: Pick<TurningPoint, 'timestamp' | 'fromSentiment' | 'toSentiment'>,
    windowSize: number
  ): Promise<{
    triggerKeywords: string[];
    triggerPosts: string[];
  }> {
    // 构建缓存键
    const cacheKey = CacheService.buildKey(
      'sentiment:transition:llm',
      eventId,
      turningPoint.timestamp
    );

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          // 1. 获取转折点前后的帖子
          const posts = await this.getPostsAroundTurningPoint(eventId, turningPoint, windowSize);

          if (posts.length === 0) {
            return {
              triggerKeywords: [],
              triggerPosts: [],
            };
          }

          // 2. 构建 LLM prompt
          const prompt = this.buildAnalysisPrompt(turningPoint, posts);

          // 3. 调用 LLM API
          const result = await this.callLLM(prompt);

          // 4. 解析结果
          return this.parseAnalysisResult(result, posts);
        } catch (error) {
          console.error('LLM 分析失败:', error);
          // 降级方案：返回空结果
          return {
            triggerKeywords: [],
            triggerPosts: [],
          };
        }
      },
      CACHE_TTL.VERY_LONG // LLM 分析结果缓存1小时
    );
  }

  /**
   * 获取转折点前后的帖子
   */
  private async getPostsAroundTurningPoint(
    eventId: string,
    turningPoint: Pick<TurningPoint, 'timestamp'>,
    windowSize: number
  ): Promise<Array<{ id: string; text: string; created_at: Date; reposts_count: number; comments_count: number; attitudes_count: number }>> {
    return useEntityManager(async (manager) => {
      const turningTime = new Date(turningPoint.timestamp);
      const startTime = new Date(turningTime);
      startTime.setHours(startTime.getHours() - windowSize);
      const endTime = new Date(turningTime);
      endTime.setHours(endTime.getHours() + windowSize);

      // 查询转折点前后的高影响力帖子
      const posts = await manager
        .getRepository(WeiboPostEntity)
        .createQueryBuilder('post')
        .select([
          'post.id',
          'post.text',
          'post.created_at',
          'post.reposts_count',
          'post.comments_count',
          'post.attitudes_count',
        ])
        .innerJoin('post.nlpResult', 'nlp')
        .where('nlp.event_id = :eventId', { eventId })
        .andWhere('post.created_at BETWEEN :startTime AND :endTime', {
          startTime,
          endTime,
        })
        .orderBy(
          'post.reposts_count + post.comments_count + post.attitudes_count',
          'DESC'
        )
        .limit(20) // 获取前20个高影响力帖子
        .getMany();

      return posts.map(post => ({
        id: post.id,
        text: post.text,
        created_at: post.created_at,
        reposts_count: post.reposts_count,
        comments_count: post.comments_count,
        attitudes_count: post.attitudes_count,
      }));
    });
  }

  /**
   * 构建 LLM 分析 prompt
   */
  private buildAnalysisPrompt(
    turningPoint: Pick<TurningPoint, 'timestamp' | 'fromSentiment' | 'toSentiment'>,
    posts: Array<{ id: string; text: string; created_at: Date }>
  ): string {
    const sentimentMap = {
      positive: '正面',
      negative: '负面',
      neutral: '中性',
    };

    return `
你是一位专业的舆情分析师。请分析以下社交媒体帖子，识别导致情感从 ${sentimentMap[turningPoint.fromSentiment]} 转变为 ${sentimentMap[turningPoint.toSentiment]} 的关键因素。

转折时间: ${turningPoint.timestamp}

帖子内容（按影响力排序）:
${posts.map((p, i) => `${i + 1}. [${p.created_at.toISOString()}] ${p.text.substring(0, 200)}${p.text.length > 200 ? '...' : ''}`).join('\n\n')}

请提供:
1. 触发情感转变的关键词（最多${SENTIMENT_TRANSITION_CONFIG.MAX_TRIGGER_KEYWORDS}个，按重要性排序）
2. 最具影响力的帖子序号（最多${SENTIMENT_TRANSITION_CONFIG.MAX_TRIGGER_POSTS}个，按影响力排序）

以 JSON 格式返回:
{
  "triggerKeywords": ["关键词1", "关键词2", ...],
  "triggerPostIndices": [1, 3, 5, ...]
}

注意：
- 关键词应该是导致情感转变的核心词汇
- 帖子序号是上面列表中的序号（1-${posts.length}）
- 只返回 JSON，不要其他解释
`;
  }

  /**
   * 调用 LLM API
   */
  private async callLLM(prompt: string): Promise<string> {
    const model = useLlmModel();
    const response = await model.invoke([
      { role: 'user', content: prompt }
    ]);
    return response.content as string;
  }

  /**
   * 解析 LLM 分析结果
   */
  private parseAnalysisResult(
    llmResponse: string,
    posts: Array<{ id: string }>
  ): {
    triggerKeywords: string[];
    triggerPosts: string[];
  } {
    try {
      // 尝试解析 JSON
      const parsed = JSON.parse(llmResponse);

      // 提取关键词
      const triggerKeywords = Array.isArray(parsed.triggerKeywords)
        ? parsed.triggerKeywords
          .slice(0, SENTIMENT_TRANSITION_CONFIG.MAX_TRIGGER_KEYWORDS)
          .filter((k: unknown): k is string => typeof k === 'string')
        : [];

      // 提取触发帖子
      const triggerPostIndices = Array.isArray(parsed.triggerPostIndices)
        ? parsed.triggerPostIndices
          .slice(0, SENTIMENT_TRANSITION_CONFIG.MAX_TRIGGER_POSTS)
          .filter((i: unknown): i is number => typeof i === 'number' && i >= 1 && i <= posts.length)
        : [];

      const triggerPosts = triggerPostIndices.map((index: number) => posts[index - 1]!.id);

      return {
        triggerKeywords,
        triggerPosts,
      };
    } catch (error) {
      console.error('解析 LLM 响应失败:', error);
      return {
        triggerKeywords: [],
        triggerPosts: [],
      };
    }
  }
}
