import type { TimeRange } from './types';

export const TREND_THRESHOLD = {
  UP: 5,
  DOWN: -5,
} as const;

export const TIME_RANGE_GRANULARITY: Record<
  TimeRange,
  'hour' | 'day' | 'week' | 'month'
> = {
  'all': 'month',
  '1h': 'hour',
  '6h': 'hour',
  '12h': 'hour',
  '24h': 'hour',
  '7d': 'day',
  '30d': 'week',
  '90d': 'month',
  '180d': 'month',
  '365d': 'month',
};

export const IMPACT_THRESHOLD = {
  HIGH: 80,
  MEDIUM: 50,
} as const;

export const INFLUENCE_WEIGHTS = {
  INTERACTION: 0.0006,
  FOLLOWERS: 0.3,
  POST_COUNT: 0.1,
} as const;

export const SENTIMENT_WEIGHT = {
  POSITIVE: 0.5,
  NEGATIVE: -0.5,
  NEUTRAL: 0,
} as const;

export const HOTNESS_CALCULATION_WEIGHTS = {
  POSTS: 0.6,
  USERS: 0.4,
} as const;
