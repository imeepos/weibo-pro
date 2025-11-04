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
    type: '社会热点' | '科技创新' | '政策法规' | '经济财经' | '文体娱乐';
    confidence: number;
  };
}

/** 输入的合并文本上下文 */
export interface PostContext {
  postId: string;
  content: string;
  comments: string[];
  subComments: string[];
  reposts: string[];
}
