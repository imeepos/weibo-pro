// 图表数据通用类型定义
export interface ChartData {
  categories: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
}

// 词云条目（与 @sker/sdk 的 WordCloudItem 保持一致）
export interface WordCloudItem {
  keyword: string;
  count: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  weight: number;
}

// 情感汇总
export interface SentimentSummary {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}
