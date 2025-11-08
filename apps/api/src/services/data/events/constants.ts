import type { TimeRange } from './types';

export const TREND_THRESHOLD = {
  UP: 5,
  DOWN: -5,
} as const;

export const TIME_RANGE_GRANULARITY: Record<
  TimeRange,
  'hour' | 'day' | 'week' | 'month'
> = {
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

export const PROPAGATION_USER_TYPES = {
  LEADER: {
    label: '意见领袖',
    userRatio: 0.05,
    postRatio: 0.15,
    influence: 95,
  },
  ACTIVE: {
    label: '活跃用户',
    userRatio: 0.15,
    postRatio: 0.35,
    influence: 75,
  },
  NORMAL: {
    label: '普通用户',
    userRatio: 0.5,
    postRatio: 0.4,
    influence: 45,
  },
  OBSERVER: {
    label: '围观群众',
    userRatio: 0.3,
    postRatio: 0.1,
    influence: 20,
  },
} as const;

export const HOTNESS_THRESHOLD = {
  VERY_HIGH: 80,
  HIGH: 50,
  MEDIUM: 30,
} as const;

export const IMPACT_THRESHOLD = {
  HIGH: 80,
  MEDIUM: 50,
} as const;

export const DEVELOPMENT_PHASES = {
  EARLY: {
    name: '萌芽期',
    description: '事件初步曝光，小范围传播',
    keyEvents: ['事件首次曝光', '初期讨论开始'],
    keyTasks: ['监测舆情动向', '识别关键信息'],
    keyMeasures: ['加强信息收集', '准备应对预案'],
  },
  OUTBREAK: {
    name: '爆发期',
    description: '事件快速发酵，引发广泛关注',
    keyEvents: ['媒体大量报道', '舆论快速升温', '话题登上热搜'],
    keyTasks: ['实时监控舆情', '及时回应关切'],
    keyMeasures: ['发布官方声明', '引导舆论方向'],
  },
  STABLE: {
    name: '平稳期',
    description: '事件热度回落，逐步平息',
    keyEvents: ['讨论趋于理性', '热度逐步降温'],
    keyTasks: ['总结经验教训', '持续跟踪监测'],
    keyMeasures: ['完善应对机制', '优化舆情管理'],
  },
} as const;

export const SPREAD_SPEED_THRESHOLD = {
  FAST: 20,
  MEDIUM: 10,
} as const;

export const DURATION_THRESHOLD = {
  LONG: 30,
  MEDIUM: 7,
} as const;

export const SUCCESS_FACTORS = {
  TOPIC_SENSITIVITY: {
    title: '话题敏感性',
    description: '事件涉及公众关注的敏感话题,容易引发共鸣',
  },
  TIMING: {
    title: '传播时机',
    description: '事件发生时机恰当,与社会热点相契合',
  },
  INFLUENCE: {
    title: '参与者影响力',
    description: '关键参与者具有较强的社会影响力',
  },
  MEDIA_PUSH: {
    title: '媒体推动',
    description: '主流媒体和自媒体的广泛报道放大了传播效果',
  },
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
