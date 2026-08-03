/**
 * 情感分析类型定义
 */

// 情感统计数据接口
export interface SentimentStatistics {
  totalAnalyzed: number;
  positive: {
    count: number;
    percentage: number;
    avgScore: number;
  };
  negative: {
    count: number;
    percentage: number;
    avgScore: number;
  };
  neutral: {
    count: number;
    percentage: number;
    avgScore: number;
  };
  overallScore: number;
  confidenceLevel: number;
}

// 实时情感数据接口
export interface SentimentRealTimeData {
  timestamp: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  trend: {
    positive: 'up' | 'down' | 'stable';
    negative: 'up' | 'down' | 'stable';
    neutral: 'up' | 'down' | 'stable';
  };
}
