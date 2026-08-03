export type TrendGranularity = 'hour' | 'day' | 'week' | 'month';

/**
 * 按粒度格式化日期为中文展示文本。
 */
export function formatDate(
  date: Date,
  granularity: TrendGranularity
): string {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();

  switch (granularity) {
    case 'hour':
      return `${month}月${day}日 ${d.getHours()}时`;
    case 'day':
      return `${month}月${day}日`;
    case 'week':
      return `第${Math.ceil(day / 7)}周`;
    case 'month':
      return `${month}月`;
    default:
      return date.toISOString();
  }
}
