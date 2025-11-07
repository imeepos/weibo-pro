import { TimeRange } from './types';
import { getDateRangeByTimeRange } from '@sker/entities';

export interface TimeRangeBoundaries {
  start: Date;
  end: Date;
}

/**
 * 获取时间范围的起止时间
 * 支持格式: '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | '90d' | '180d' | '365d'
 */
export function getTimeRangeBoundaries(timeRange: TimeRange = '24h'): TimeRangeBoundaries {
  return getDateRangeByTimeRange(timeRange);
}

/**
 * 获取前一个时间范围的起止时间（用于计算变化率）
 */
export function getPreviousTimeRangeBoundaries(timeRange: TimeRange): TimeRangeBoundaries {
  const current = getTimeRangeBoundaries(timeRange);
  const duration = current.end.getTime() - current.start.getTime();

  return {
    start: new Date(current.start.getTime() - duration),
    end: new Date(current.start.getTime() - 1)
  };
}

/**
 * 计算变化率（百分比）
 */
export function calculateChangeRate(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * 获取昨天的时间范围（用于计算地域趋势）
 */
export function getYesterdayBoundaries(): TimeRangeBoundaries {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setDate(now.getDate() - 1);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}
