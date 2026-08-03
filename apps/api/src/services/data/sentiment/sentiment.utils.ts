/**
 * 情感分析工具函数
 */

import type { TimeRange } from '../types';

// 计算趋势
export function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const changeRate = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  if (Math.abs(changeRate) < 5) return 'stable';
  return changeRate > 0 ? 'up' : 'down';
}

// 根据时间范围选择时间粒度
export function getTimeGranularity(timeRange: TimeRange): string {
  // 解析时间范围
  const match = timeRange.match(/^(\d+)([hd])$/);
  if (!match) return 'hour';

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  if (unit === 'h') {
    // 小时级别：统一按小时
    return 'hour';
  } else {
    // 天级别
    if (value <= 7) return 'hour';      // 7天内按小时
    if (value <= 90) return 'day';      // 90天内按天
    return 'week';                       // 更长时间按周
  }
}
