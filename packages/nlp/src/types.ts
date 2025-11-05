/**
 * NLP 分析结果类型定义
 */

/** 一次性分析的完整结果 */
export interface CompleteAnalysisResult {
  // 情感分析
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral';
    confidence: number;
    positive_prob: number;
    negative_prob: number;
    neutral_prob: number;
  };

  // 关键词（用于词云）
  keywords: Array<{
    keyword: string;
    weight: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    pos: string;
    count: number;
  }>;

  // 事件分类
  event: {
    type: string; // 从已有分类中选择，或提议新分类
    confidence: number;
    isNewCategory?: boolean; // 是否为新建议的分类
  };

  // 事件标题（10-30字的简明描述）
  eventTitle: string;

  // 事件简介（50-200字的详细描述）
  eventDescription: string;

  // 事件标签（3-10个）
  tags: Array<{
    name: string; // 标签名称
    type: 'keyword' | 'topic' | 'entity'; // 标签类型
    isNew?: boolean; // 是否为新建议的标签
  }>;
}

/** 输入的合并文本上下文 */
export interface PostContext {
  postId: string;
  content: string;
  comments: string[];
  subComments: string[];
  reposts: string[];
}
