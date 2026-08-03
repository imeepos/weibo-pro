import type { DistillationTaskProgress } from '@sker/sdk';

// 进度增量补丁：counters / coverage 允许部分字段
export type DistillationTaskProgressPatch =
  Omit<Partial<DistillationTaskProgress>, 'counters' | 'coverage'> & {
    counters?: Partial<DistillationTaskProgress['counters']>;
    coverage?: Partial<DistillationTaskProgress['coverage']>;
  };

export const createEmptyDistillationProgress = (): DistillationTaskProgress => ({
  stage: 'queued',
  partial: false,
  latestMessage: '任务已入队，等待开始抓取历史发帖',
  lastProgressAt: new Date().toISOString(),
  counters: {
    crawledPosts: 0,
    reusedExtractions: 0,
    extractedPosts: 0,
    failedPosts: 0,
    eventClusterCount: 0,
    coordinationSignalCount: 0,
    warningCount: 0,
  },
  coverage: {
    latestPostAt: null,
    oldestPostAt: null,
  },
  recentWarnings: [],
});
