/**
 * DistillationWorkspacePanel 测试共享数据 fixtures。
 * 从拆分前的 DistillationWorkspacePanel.test.tsx 中抽取,仅包含纯数据,不含任何 vi.mock / 断言逻辑。
 */
import type {
  DistillationTaskSummary,
  PersonaEvidenceItem,
  PersonaListItem,
  PersonaMemoryGraph,
} from '@sker/sdk';

export const personaSummary: PersonaListItem = {
  id: 'persona-1',
  name: '用户A Persona',
  avatar: null,
  description: '人物画像',
  memoryCount: 4,
  createdAt: '2026-04-23T00:00:00.000Z',
};

export const evidenceItem: PersonaEvidenceItem = {
  id: 'e1',
  memoryId: 'm1',
  sourceTable: 'weibo_posts',
  sourceId: 'p1',
  excerpt: '代表性帖子证据',
  evidenceType: 'direct_quote',
  score: 0.9,
  createdAt: '2026-04-23T00:00:00.000Z',
};

export const memoryGraph: PersonaMemoryGraph = {
  persona: {
    id: 'persona-1',
    name: '用户A Persona',
    avatar: null,
    description: '人物画像',
    traits: ['热点追逐'],
  },
  memories: [
    {
      id: 'm1',
      name: '热点追逐型',
      description: null,
      content: '长期追逐热点并放大情绪',
      type: 'insight',
      createdAt: '2026-04-23T00:00:00.000Z',
    },
    {
      id: 'm2',
      name: '情绪放大型',
      description: null,
      content: '偏好情绪化表达',
      type: 'concept',
      createdAt: '2026-04-23T00:00:00.000Z',
    },
  ],
  relations: [{
    id: 'r1',
    sourceId: 'm1',
    targetId: 'm2',
    relationType: 'related',
  }],
  tree: [],
  timeline: [],
  coordinationSignals: [],
  stats: {
    totalMemories: 2,
    totalEvents: 0,
    totalEvidencePosts: 1,
    totalWarnings: 0,
  },
};

export const publishedTask: DistillationTaskSummary = {
  id: 'task-1',
  weiboUserId: '100',
  eventId: 'event-1',
  status: 'published',
  historyWindowDays: 90,
  sourcePostCount: 20,
  sourceCommentCount: 2,
  sourceRepostCount: 3,
  evidenceSampleCount: 5,
  model: 'gpt-5',
  promptVersion: 'v1',
  distilledSummary: '短摘要',
  reviewStatus: 'auto_pass',
  errorMessage: null,
  startedAt: null,
  completedAt: null,
  createdAt: '2026-04-23T00:00:00.000Z',
  updatedAt: '2026-04-23T00:00:00.000Z',
};

export const reviewPendingTask: DistillationTaskSummary = {
  id: 'task-1',
  weiboUserId: '100',
  eventId: 'event-1',
  status: 'review_pending',
  historyWindowDays: 90,
  sourcePostCount: 20,
  sourceCommentCount: 2,
  sourceRepostCount: 3,
  evidenceSampleCount: 5,
  model: 'gpt-5',
  promptVersion: 'v1',
  distilledSummary: '短摘要',
  reviewStatus: 'human_pending',
  errorMessage: null,
  startedAt: null,
  completedAt: null,
  createdAt: '2026-04-23T00:00:00.000Z',
  updatedAt: '2026-04-23T00:00:00.000Z',
};

export const crawlingTask: DistillationTaskSummary = {
  id: 'task-1',
  weiboUserId: '100',
  eventId: null,
  status: 'crawling',
  historyWindowDays: 90,
  sourcePostCount: 0,
  sourceCommentCount: 0,
  sourceRepostCount: 0,
  evidenceSampleCount: 0,
  model: null,
  promptVersion: null,
  distilledSummary: null,
  reviewStatus: null,
  errorMessage: null,
  startedAt: '2026-04-23T00:00:00.000Z',
  completedAt: null,
  createdAt: '2026-04-23T00:00:00.000Z',
  updatedAt: '2026-04-23T00:00:00.000Z',
};

export const analyzingTask: DistillationTaskSummary = {
  id: 'task-1',
  weiboUserId: '100',
  eventId: null,
  status: 'analyzing',
  historyWindowDays: 90,
  sourcePostCount: 62,
  sourceCommentCount: 0,
  sourceRepostCount: 0,
  evidenceSampleCount: 0,
  model: null,
  promptVersion: null,
  distilledSummary: '正在生成画像，已等待 15 秒，当前样本帖子 62 条',
  reviewStatus: null,
  errorMessage: null,
  startedAt: '2026-04-23T00:00:00.000Z',
  completedAt: null,
  createdAt: '2026-04-23T00:00:00.000Z',
  updatedAt: '2026-04-23T00:04:30.000Z',
};

/** 进行中任务(aggregating/extracting)共享的基础字段,status/distilledSummary/progress 由各任务覆盖。 */
const activeTaskBase = {
  id: 'task-1',
  weiboUserId: '100',
  eventId: null,
  historyWindowDays: 90,
  sourcePostCount: 20,
  sourceCommentCount: 0,
  sourceRepostCount: 0,
  evidenceSampleCount: 0,
  model: null,
  promptVersion: null,
  reviewStatus: null,
  errorMessage: null,
  startedAt: '2026-04-28T01:00:00.000Z',
  completedAt: null,
  createdAt: '2026-04-28T01:00:00.000Z',
  updatedAt: '2026-04-28T01:05:00.000Z',
};

export const aggregatingTask: DistillationTaskSummary = {
  ...activeTaskBase,
  status: 'aggregating',
  distilledSummary: '正在聚合 20 条帖子提取结果',
  progress: {
    stage: 'aggregating',
    partial: true,
    latestMessage: '正在聚合 20 条帖子提取结果',
    lastProgressAt: '2026-04-28T01:05:00.000Z',
    counters: {
      crawledPosts: 20,
      reusedExtractions: 12,
      extractedPosts: 7,
      failedPosts: 1,
      eventClusterCount: 3,
      coordinationSignalCount: 1,
      warningCount: 2,
    },
    coverage: {
      latestPostAt: '2026-04-28T01:00:00.000Z',
      oldestPostAt: '2026-04-21T01:00:00.000Z',
    },
    recentWarnings: ['帖子 998 提取失败：timeout'],
  },
};

export const extractingTask: DistillationTaskSummary = {
  ...activeTaskBase,
  status: 'extracting',
  distilledSummary: '正在逐帖抽取，已处理 8/20 条帖子',
  progress: {
    stage: 'extracting',
    partial: true,
    latestMessage: '正在逐帖抽取，已处理 8/20 条帖子',
    lastProgressAt: '2026-04-28T01:03:30.000Z',
    counters: {
      crawledPosts: 20,
      reusedExtractions: 4,
      extractedPosts: 3,
      failedPosts: 1,
      eventClusterCount: 0,
      coordinationSignalCount: 0,
      warningCount: 2,
    },
    coverage: {
      latestPostAt: '2026-04-28T01:00:00.000Z',
      oldestPostAt: '2026-04-21T01:00:00.000Z',
    },
    recentWarnings: ['帖子 998 提取失败：timeout'],
  },
};

/** 覆盖时间戳为非字符串(Date 实例)时也应容错。 */
export const extractingTaskWithNonStringCoverage = {
  ...activeTaskBase,
  status: 'extracting',
  distilledSummary: '正在逐帖抽取，已处理 8/20 条帖子',
  progress: {
    stage: 'extracting',
    partial: false,
    latestMessage: '正在逐帖抽取，已处理 8/20 条帖子',
    lastProgressAt: '2026-04-28T01:03:30.000Z',
    counters: {
      crawledPosts: 20,
      reusedExtractions: 4,
      extractedPosts: 3,
      failedPosts: 1,
      eventClusterCount: 0,
      coordinationSignalCount: 0,
      warningCount: 0,
    },
    coverage: {
      latestPostAt: new Date('2026-04-28T01:00:00.000Z'),
      oldestPostAt: '2026-04-21T01:00:00.000Z',
    },
    recentWarnings: [],
  },
} as unknown as DistillationTaskSummary;
