// 图表数据通用类型定义
export interface ChartData {
  categories: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
}

// 词云条目
export interface WordCloudItem {
  keyword: string;
  count: number;
  sentiment: string;
  weight: number;
}

// 情感汇总
export interface SentimentSummary {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}
