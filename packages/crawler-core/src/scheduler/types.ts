/**
 * 任务状态
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 爬虫任务
 */
export interface CrawlerTask<T = any> {
  id: string;
  type: string;
  payload: T;
  priority?: number;
  status?: TaskStatus;
  createdAt?: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

/**
 * 定时任务配置
 */
export interface ScheduledTask {
  name: string;
  cron: string;
  taskType: string;
  payload: any;
  enabled?: boolean;
}

/**
 * 任务处理器
 */
export type TaskHandler<T = any> = (task: CrawlerTask<T>) => Promise<void>;
