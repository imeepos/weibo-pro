import type { TimeRange } from '@sker/entities';

export const PAGE_SIZE = 20;
export const SUCCESS_THRESHOLD = 90;
export const TOKEN_MILLION = 1_000_000;
export const TOKEN_THOUSAND = 1_000;
export const HTTP_OK = 200;
export const HTTP_CLIENT_ERROR = 400;
export const HTTP_SERVER_ERROR = 500;

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '1h': '近1小时',
  '6h': '近6小时',
  '12h': '近12小时',
  '24h': '近24小时',
  '7d': '近7天',
  '30d': '近30天',
  '90d': '近90天',
  '180d': '近180天',
  '365d': '近365天',
};
