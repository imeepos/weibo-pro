import type { CompleteAnalysisResult, PostContext } from './types';
import { useOpenAi } from './openai';
import { Injectable } from '@sker/core';

/**
 * NLP 分析器：一次调用获取情感分析、关键词提取、事件分类
 */
@Injectable()
export class NLPAnalyzer {

  /**
   * 一次性分析：返回情感、关键词、事件分类
   */
  async analyze(context: PostContext): Promise<CompleteAnalysisResult> {
    const mergedText = this.buildContext(context);
    const prompt = this.buildPrompt(mergedText);
    const client = useOpenAi()
    const response = await client.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-V3.2-Exp',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from LLM');
    }
    return JSON.parse(content);
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
  private buildPrompt(text: string): string {
    return `你是一个社交媒体舆情分析专家。请分析以下微博帖子及其互动内容，返回 JSON 格式的完整分析结果。

要求：
1. **情感分析**：综合帖子和所有互动内容，判断整体情感倾向
2. **关键词提取**：提取最重要的 30 个关键词，包含权重、情感、词性、频次
3. **事件分类**：将内容归类到五大类别之一

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
  ],
  "event": {
    "type": "社会热点|科技创新|政策法规|经济财经|文体娱乐",
    "confidence": 0.88
  }
}

说明：
- sentiment.overall: 整体情感倾向
- sentiment.confidence: 判断的置信度（0-1）
- sentiment.*_prob: 各情感的概率（总和为 1）
- keywords: 按 weight 降序排列，最多 30 个
  - keyword: 关键词文本
  - weight: 重要性权重（0-1）
  - sentiment: 该关键词的情感色彩
  - pos: 词性（noun/verb/adj）
  - count: 在原文中出现的次数
- event.type: 必须是五个类别之一
- event.confidence: 分类的置信度

内容：
${text}`;
  }
}
