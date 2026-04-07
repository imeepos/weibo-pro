import type { CompleteAnalysisResult, PostContext } from './types';
import { useOpenAi } from './openai';
import { Injectable } from '@sker/core';
import { parse } from '@sker/json-harmony';

const BASE_RETRY_DELAY_MS = 5000; // 基础重试延迟 5 秒
const MAX_RETRIES = 3;
/**
 * NLP 分析器：一次调用获取情感分析、关键词提取、事件分类
 */
@Injectable()
export class NLPAnalyzer {

  /**
   * 一次性分析：返回情感、关键词、事件分类、标签
   *
   * @param context 帖子上下文
   * @param availableCategories 可选，可用的事件类别列表
   * @param availableTags 可选，可用的标签列表
   * @param recentEvents 可选，最近的事件列表（用于去重）
   */
  async analyze(
    context: PostContext
  ): Promise<CompleteAnalysisResult> {
    const mergedText = this.buildContext(context);
    const prompt = this.buildPrompt(mergedText);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const client = await useOpenAi();
        const response = await client.chat.completions.create({
          model: 'deepseek-ai/DeepSeek-V3.2',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('LLM 未返回有效内容');
        }
        const result = parse(content);
        return result.data as any;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        // 判断是否为可重试的错误（429 限流、503 服务不可用、网络错误）
        const isRetriableError =
          errorMsg.includes('429') ||
          errorMsg.includes('503') ||
          errorMsg.includes('无可用 provider') ||
          errorMsg.includes('rate limit') ||
          errorMsg.includes('ECONNREFUSED') ||
          errorMsg.includes('ETIMEDOUT') ||
          errorMsg.includes('TimeoutError') ||
          errorMsg.includes('Connection error') ||
          errorMsg.includes('ECONNRESET') ||
          errorMsg.includes('ENOTFOUND');

        if (isRetriableError && attempt < MAX_RETRIES - 1) {
          const waitTime = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(`[NLPAnalyzer] 分析失败，${waitTime / 1000}秒后重试 (${attempt + 1}/${MAX_RETRIES})`, {
            error: errorMsg,
            nextRetryIn: `${waitTime / 1000}s`
          });
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        throw new Error(`NLP 分析失败: ${errorMsg}`);
      }
    }

    throw new Error('NLP 分析失败: 达到最大重试次数');
  }

  /**
   * 构建上下文：帖子+评论+子评论+转发
   */
  private buildContext(context: PostContext): string {
    const parts: string[] = [];

    parts.push(`【帖子内容】\n${context.content}`);

    if (context.comments.length > 0) {
      parts.push(`\n【评论】\n${context.comments.join('\n')}`);
    }

    if (context.subComments.length > 0) {
      parts.push(`\n【子评论】\n${context.subComments.join('\n')}`);
    }

    if (context.reposts.length > 0) {
      parts.push(`\n【转发】\n${context.reposts.join('\n')}`);
    }

    return parts.join('\n');
  }

  /**
   * 构建提示词：一次性获取所有数据
   */
  private buildPrompt(
    text: string
  ): string {

    return `你是一个社交媒体舆情分析专家。请分析以下微博帖子及其互动内容，返回 JSON 格式的完整分析结果。

要求：
1. **情感分析**：综合帖子和所有互动内容，判断整体情感倾向
2. **关键词提取**：提取最重要的 30 个关键词，包含权重、情感、词性、频次

返回格式（严格 JSON）：
{
  "sentiment": {
    "overall": "positive|negative|neutral",
    "confidence": 0.95,
    "positive_prob": 0.75,
    "negative_prob": 0.10,
    "neutral_prob": 0.15
  },
  "keywords": [
    {
      "keyword": "关键词",
      "weight": 0.95,
      "sentiment": "positive",
      "pos": "noun",
      "count": 8
    }
  ]
}

说明：
- sentiment: 情感分析
  - overall: 整体情感倾向
  - confidence: 判断的置信度（0-1）
  - *_prob: 各情感的概率（总和为 1）

- keywords: 按 weight 降序排列，最多 30 个
  - keyword: 关键词文本
  - weight: 重要性权重（0-1）
  - sentiment: 该关键词的情感色彩
  - pos: 词性（noun/verb/adj）
  - count: 在原文中出现的次数

内容：
${text}`;
  }
}
