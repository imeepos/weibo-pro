import type { TimeRange } from '../types';

/**
 * 根据时间范围推断时间序列聚合粒度
 */
export function getTimeGranularity(timeRange: TimeRange): string {
  const granularityMap: Record<TimeRange, string> = {
    'all': 'month',
    '1h': 'hour',
    '6h': 'hour',
    '12h': 'hour',
    '24h': 'hour',
    '7d': 'day',
    '30d': 'day',
    '90d': 'week',
    '180d': 'week',
    '365d': 'month',
  };
  return granularityMap[timeRange] || 'day';
}

/**
 * 将数据库时间桶格式化为图表坐标轴标签
 */
export function formatTimeLabel(timestamp: Date, granularity: string): string {
  const date = new Date(timestamp);

  switch (granularity) {
    case 'hour':
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
    case 'day':
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    case 'week':
      return `第${Math.ceil(date.getDate() / 7)}周`;
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    default:
      return date.toISOString().split('T')[0]!;
  }
}
