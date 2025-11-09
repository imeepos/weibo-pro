/**
 * API类型定义
 *
 * 存在即合理：
 * - 统一的API请求/响应格式
 * - 类型安全的接口定义
 * - 清晰的错误处理
 */

/**
 * 任务提交请求
 */
export interface SubmitTaskRequest {
  type: string;                  // 任务类型
  payload: any;                  // 任务负载
  priority?: number;             // 优先级
  maxRetries?: number;           // 最大重试次数
  scheduledAt?: string;          // 计划执行时间
}

/**
 * 批量任务提交请求
 */
export interface BatchSubmitTasksRequest {
  tasks: SubmitTaskRequest[];    // 任务列表
}

/**
 * 任务提交响应
 */
export interface SubmitTaskResponse {
  taskId: string;                // 任务ID
  status: string;                // 任务状态
  message: string;               // 响应消息
}

/**
 * 任务状态响应
 */
export interface TaskStatusResponse {
  id: string;                    // 任务ID
  status: string;                // 任务状态
  progress: number;              // 进度百分比
  createdAt: string;             // 创建时间
  startedAt?: string;            // 开始时间
  completedAt?: string;          // 完成时间
  executions: any[];             // 执行记录
}

/**
 * 系统状态响应
 */
export interface SystemStatusResponse {
  queues: Record<string, {
    messageCount: number;        // 消息数量
    consumerCount: number;       // 消费者数量
    state: string;               // 队列状态
  }>;
  tasks: {
    pending: number;             // 待处理任务数
    running: number;             // 运行中任务数
    completed: number;           // 已完成任务数
    failed: number;              // 失败任务数
  };
  system: {
    uptime: string;              // 运行时间
    memoryUsage: string;         // 内存使用率
    cpuUsage: string;            // CPU使用率
  };
}