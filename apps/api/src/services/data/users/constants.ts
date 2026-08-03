// 用户蒸馏任务相关常量

export const ACTIVE_DISTILLATION_TASK_STATUSES = new Set([
  'queued',
  'crawling',
  'extracting',
  'aggregating',
  'publishing',
  'analyzing',
]);

export const DEFAULT_DISTILLATION_TIMEOUT_MS = 10 * 60 * 1000;
export const DEFAULT_DISTILLATION_HEARTBEAT_MS = 15 * 1000;
export const DEFAULT_POST_EXTRACTION_VERSION = 'post-v1';
