import type { TimeRange } from '../services/data/types';

const VALID_TIME_RANGES: TimeRange[] = ['all', '1h', '6h', '12h', '24h', '7d', '30d', '90d', '180d', '365d'];

export function isValidTimeRange(value: string): value is TimeRange {
  return VALID_TIME_RANGES.includes(value as TimeRange);
}

export function validateTimeRange(timeRange?: string): TimeRange {
  if (!timeRange) return '24h';
  return isValidTimeRange(timeRange) ? timeRange : '24h';
}

export function toPaginationParams(page?: string, pageSize?: string) {
  return {
    page: page ? parseInt(page, 10) : 1,
    pageSize: pageSize ? parseInt(pageSize, 10) : 10
  };
}
