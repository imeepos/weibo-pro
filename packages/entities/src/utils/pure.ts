/**
 * 纯工具函数 - 不依赖任何 Node.js 模块或环境变量
 * 这些函数可以在浏览器环境中安全使用
 */

export type TimeRange = 'all' | '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | '90d' | '180d' | '365d';

/** 根据时间范围计算日期范围 */
export const getDateRangeByTimeRange = (timeRange: TimeRange = '24h'): { start: Date; end: Date } => {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  // 处理 'all' - 返回从很久以前到现在的时间范围
  if (timeRange === 'all') {
    start.setFullYear(2000, 0, 1); // 从 2000-01-01 开始
    return { start, end };
  }

  // 解析时间范围字符串 (格式: '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | '90d' | '180d' | '365d')
  const match = timeRange.match(/^(\d+)([hd])$/);
  if (!match) {
    // 默认返回最近24小时
    start.setHours(now.getHours() - 24);
    return { start, end };
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  if (unit === 'h') {
    // 小时
    start.setHours(now.getHours() - value);
  } else if (unit === 'd') {
    // 天
    start.setDate(now.getDate() - value);
  }

  return { start, end };
};
