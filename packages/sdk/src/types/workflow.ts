/**
 * 工作流相关类型(含运行实例、调度)
 */

// 工作流相关类型
export interface WorkflowStatus {
  nlpQueue: string
  workflowEngine: string
  lastExecution: string
}

export interface SearchWeiboResult {
  message: string
  keyword: string
  startDate: string
  endDate: string
  page: number
  searchResult: any
}

export interface BatchNlpResult {
  message: string
  total: number
  results: Array<{
    postId: string
    status: string
  }>
}

export interface CrawlPostResult {
  message: string
  postId: string
  mid?: string
  uid?: string
  commentsCount: number
  commentsCrawled: boolean
  repostsCrawled: boolean
}

// 工作流管理相关类型
export interface SaveWorkflowPayload {
  id?: string
  name: string
  workflowData: {
    nodes: any[]
    edges: any[]
  }
}

export interface WorkflowData {
  id: string
  name: string
  data: {
    nodes: any[]
    edges: any[]
  }
  createdAt: string
  updatedAt: string
}

export interface WorkflowSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  tags?: string[]
  description?: string
}

export interface CreateShareResult {
  shareToken: string
  shareUrl: string
}

export interface ExecuteNodeResult {
  nodeId: string
  state: 'pending' | 'running' | 'success' | 'fail'
  result?: any
  error?: string
}

// 工作流运行状态枚举（前端专用）
export enum RunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

// 工作流运行实例类型（前端专用）
export interface WorkflowRunEntity {
  id: string
  workflowId: string
  scheduleId?: string
  status: RunStatus
  graphSnapshot: unknown
  inputs: Record<string, unknown>
  outputs?: Record<string, unknown>
  nodeStates: Record<string, unknown>
  error?: {
    message: string
    stack?: string
    nodeId?: string
  }
  startedAt?: Date
  completedAt?: Date
  durationMs?: number
  createdAt: Date
  updatedAt: Date
}

// 工作流运行实例相关类型
export interface CreateRunResult {
  runId: string
  run: WorkflowRunEntity
}

export interface ListRunsResult {
  runs: WorkflowRunEntity[]
  total: number
  page: number
  pageSize: number
}

// 工作流调度相关类型
export enum ScheduleType {
  ONCE = 'once',
  CRON = 'cron',
  INTERVAL = 'interval',
  CONTINUOUS = 'continuous', // 持续模式：执行完毕后立即重新执行
  MANUAL = 'manual',
}

export enum ScheduleStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
}

export interface WorkflowScheduleEntity {
  id: string
  workflowId: string
  name: string
  scheduleType: ScheduleType
  cronExpression?: string
  intervalSeconds?: number
  inputs: Record<string, unknown>
  status: ScheduleStatus
  startTime: Date
  endTime?: Date
  lastRunAt?: Date
  nextRunAt?: Date
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
