// 模拟小时级统计数据
export interface HourlyStatistics {
  year: number;
  month: number;
  day: number;
  hour: number;
  hotness: number;
  post_count: number;
  user_count: number;
  sentiment_positive: number;
}

/**
 * 构建小时级统计数据（默认 2024-01-01）
 */
export function h(
  hour: number,
  hotness: number,
  post_count: number,
  user_count: number,
  sentiment_positive: number,
  year = 2024,
  month = 1,
  day = 1,
): HourlyStatistics {
  return { year, month, day, hour, hotness, post_count, user_count, sentiment_positive };
}
