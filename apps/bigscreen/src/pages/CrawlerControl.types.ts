// 任务类型枚举
export type TaskType = 'crawl' | 'nlp' | 'crawl-and-analyze' | 'batch-nlp' | 'search';

// 任务执行记录
export interface TaskExecution {
  id: string;
  type: TaskType;
  status: 'pending' | 'success' | 'error';
  timestamp: string;
  params: any;
  message?: string;
}
