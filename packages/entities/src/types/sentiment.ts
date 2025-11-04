export interface SentimentScore {
  positive: number;
  negative: number;
  neutral: number;
}

export interface TrendMetrics {
  post_growth_rate: number;
  user_growth_rate: number;
  hotness_change: number;
}
