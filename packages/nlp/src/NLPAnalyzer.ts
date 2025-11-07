import type { CompleteAnalysisResult, PostContext } from './types';
import { useOpenAi } from './openai';
import { Injectable } from '@sker/core';

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
    context: PostContext,
    availableCategories?: string[],
    availableTags?: string[],
    recentEvents?: Array<{ title: string; description?: string }>
  ): Promise<CompleteAnalysisResult> {
    try {
      const mergedText = this.buildContext(context);
      const prompt = this.buildPrompt(mergedText, availableCategories, availableTags, recentEvents);
      const client = useOpenAi();

      console.log('开始 NLP 分析，文本长度:', mergedText.length);

      const response = await client.chat.completions.create({
        model: 'deepseek-ai/DeepSeek-V3.2-Exp',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      console.log('NLP 分析完成，响应状态:', response.choices.length > 0 ? '成功' : '无响应');

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('LLM 未返回有效内容');
      }

      const result = JSON.parse(content);
      console.log('NLP 分析结果:', {
        sentiment: result.sentiment?.overall,
        keywordsCount: result.keywords?.length || 0,
        eventType: result.event?.type
      });

      return result;
    } catch (error) {
      console.error('NLP 分析失败:', {
        error: error instanceof Error ? error.message : '未知错误',
        contextLength: context.content?.length || 0
      });
      throw new Error(`NLP 分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
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
    text: string,
    availableCategories?: string[],
    availableTags?: string[],
    recentEvents?: Array<{ title: string; description?: string }>
  ): string {
    const categoriesHint = availableCategories?.length
      ? availableCategories.join('|')
      : '社会热点|科技创新|政策法规|经济财经|文体娱乐';

    const tagsHint = availableTags?.length
      ? `已有标签：${availableTags.join('、')}`
      : '可自由创建新标签';

    // 构建最近事件的提示
    const recentEventsHint = recentEvents?.length
      ? `\n**重要：已有事件列表（最近30天）**
请仔细检查以下已有事件，如果当前内容与某个事件描述的是同一件事，**必须使用相同或高度相似的标题**，避免创建重复事件：

${recentEvents.slice(0, 50).map((e, i) => `${i + 1}. ${e.title}${e.description ? `\n   简介：${e.description}` : ''}`).join('\n')}

**去重规则：**
- 如果当前内容与已有事件属于同一事件（相同的人物、地点、主题），请使用已有事件的标题或稍作调整
- 示例：如果已有"杨幂成为享界S9T品牌大使"，新内容讨论杨幂的代言活动，应使用相同标题
- 只有在确实是完全不同的事件时，才创建新标题
`
      : '';

    return `你是一个社交媒体舆情分析专家。请分析以下微博帖子及其互动内容，返回 JSON 格式的完整分析结果。
${recentEventsHint}

要求：
1. **情感分析**：综合帖子和所有互动内容，判断整体情感倾向
2. **关键词提取**：提取最重要的 30 个关键词，包含权重、情感、词性、频次
3. **事件分类**：优先从已有类别中选择；如果都不合适，可提议新分类（设置 isNewCategory: true）
4. **事件标题**：为该事件生成一个简明扼要的标题（10-30字）
5. **事件简介**：生成一段客观、全面的事件描述（50-200字），概括事件的核心内容、背景和关键点
6. **事件标签**：提取 3-10 个标签，优先使用已有标签；如确实需要，可创建新标签（设置 isNew: true）

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
    "type": "${categoriesHint}",
    "confidence": 0.88,
    "isNewCategory": false
  },
  "eventTitle": "简明扼要的事件标题",
  "eventDescription": "客观全面的事件描述，概括核心内容、背景和关键点（50-200字）",
  "tags": [
    {
      "name": "标签名",
      "type": "keyword|topic|entity",
      "isNew": false
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

- event: 事件分类
  - type: 优先从以下类别中选择：${categoriesHint}
    如果都不合适，可以提议一个新的类别名称，并设置 isNewCategory: true
  - confidence: 分类的置信度
  - isNewCategory: 是否为新建议的分类（默认 false）

- eventTitle: 事件标题（10-30字），应该是连贯的叙事性描述，说明发生了什么事情，而不是关键词列表

- eventDescription: 事件简介（50-200字）
  - 客观描述事件的核心内容
  - 包含必要的背景信息
  - 突出关键观点和争议点
  - 语言简洁专业，避免情绪化表达

- tags: 事件标签（3-10个）
  ${tagsHint}
  - name: 标签名称（简短精炼，2-6个字）
  - type: 标签类型
    - keyword: 关键概念或术语
    - topic: 话题或领域
    - entity: 实体（人物、组织、地点等）
  - isNew: 是否为新建议的标签（如果该标签不在已有列表中，设为 true）

内容：
${text}`;
  }
}
