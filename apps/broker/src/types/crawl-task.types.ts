/**
 * 爬虫任务类型定义
 *
 * 存在即合理：
 * - 统一的爬虫任务类型枚举
 * - 完整的任务数据结构
 * - 类型安全的API设计
 */

/**
 * 爬虫任务类型枚举
 */
export enum CrawlTaskType {
  // 微博相关任务
  WEIBO_HOT_TIMELINE = 'weibo_hot_timeline',
  WEIBO_KEYWORD_SEARCH = 'weibo_keyword_search',
  WEIBO_USER_PROFILE = 'weibo_user_profile',
  WEIBO_POST_DETAIL = 'weibo_post_detail',
  WEIBO_COMMENTS = 'weibo_comments',
  WEIBO_REPOSTS = 'weibo_reposts',

  // 其他平台任务（可扩展）
  DOUYIN_TRENDING = 'douyin_trending',
  ZHIHU_HOT = 'zhihu_hot',
}

/**
 * 爬虫任务状态
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 爬虫任务优先级
 */
export enum TaskPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 8,
  URGENT = 10,
}

/**
 * 爬虫任务接口
 */
export interface CrawlTask {
  id: string;                    // 任务唯一标识
  type: CrawlTaskType;           // 任务类型
  payload: any;                  // 任务负载数据
  priority: TaskPriority;        // 优先级
  maxRetries: number;            // 最大重试次数
  retryDelay: number;            // 重试延迟(ms)
  createdAt: Date;               // 创建时间
  scheduledAt?: Date;            // 计划执行时间
  metadata?: Record<string, any>; // 元数据
}

/**
 * 任务执行记录
 */
export interface TaskExecution {
  id: string;                    // 执行记录ID
  taskId: string;                // 任务ID
  status: TaskStatus;            // 执行状态
  startedAt: Date;               // 开始时间
  completedAt?: Date;            // 完成时间
  error?: string;                // 错误信息
  result?: any;                  // 执行结果
  retryCount: number;            // 重试次数
}