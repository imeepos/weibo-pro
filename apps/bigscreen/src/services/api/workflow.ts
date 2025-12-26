/**
 * 工作流 API 服务
 * 基于 @sker/sdk WorkflowController 的统一封装
 */

import { root } from '@sker/core'
import { WorkflowController, type WorkflowSummary, type WorkflowGraphAst, RunStatus } from '@sker/sdk'
import { createLogger } from '@/utils'

const logger = createLogger('WorkflowAPI')

// ================ 类型定义 ================

/** 触发 NLP 分析请求 */
export interface TriggerNLPRequest {
  postId: string
}

/** 爬取帖子请求 */
export interface CrawlPostRequest {
  postId: string
}

/** 爬取帖子响应数据 */
export interface CrawlPostData {
  postId: string
  mid: string
  uid: string
  commentsCount: number
  repostsCount: number
  commentsCrawled: boolean
  repostsCrawled: boolean
}

/** 批量触发 NLP 分析请求 */
export interface BatchNLPRequest {
  postIds: string[]
}

/** 微博关键词搜索请求 */
export interface WeiboSearchRequest {
  keyword: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  page?: number
}

/** 工作流状态响应 */
export interface WorkflowStatusResponse {
  nlpQueue: 'active' | 'inactive' | 'error'
  workflowEngine: 'running' | 'stopped' | 'error'
  lastExecution?: string // ISO 8601 时间戳
  queueDepth?: number
}

/** API 响应包装 */
export interface WorkflowApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  timestamp?: string
}

// ================ API 服务类 ================

export class WorkflowAPI {
  /**
   * 获取工作流列表
   */
  static async listWorkflows(): Promise<WorkflowSummary[]> {
    logger.debug('Fetching workflow list')
    const controller = root.get(WorkflowController)
    return controller.listWorkflows()
  }

  /**
   * 获取工作流详情
   */
  static async getWorkflow(name: string): Promise<WorkflowGraphAst | null> {
    logger.debug('Fetching workflow', { name })
    const controller = root.get(WorkflowController)
    return controller.getWorkflow({ name })
  }

  /**
   * 保存工作流
   */
  static async saveWorkflow(workflow: WorkflowGraphAst) {
    logger.debug('Saving workflow', { name: workflow.name })
    const controller = root.get(WorkflowController)
    return controller.saveWorkflow(workflow)
  }

  /**
   * 删除工作流
   */
  static async deleteWorkflow(id: string): Promise<{ success: boolean }> {
    logger.debug('Deleting workflow', { id })
    const controller = root.get(WorkflowController)
    return controller.deleteWorkflow({ id })
  }

  /**
   * 获取工作流模板列表
   */
  static async listTemplates() {
    logger.debug('Fetching workflow templates')
    const controller = root.get(WorkflowController)
    return controller.listTemplates()
  }

  /**
   * 初始化工作流
   */
  static async initWorkflow(name: string) {
    logger.debug('Initializing workflow', { name })
    const controller = root.get(WorkflowController)
    return controller.initWorkflow({ name })
  }

  /**
   * 执行工作流（SSE）
   */
  static executeWorkflow(payload: { ast: any; workflow: WorkflowGraphAst; input?: Record<string, any> }) {
    logger.debug('Executing workflow', { workflowName: payload.workflow.name })
    const controller = root.get(WorkflowController)
    return controller.execute(payload)
  }

  /**
   * 执行单个节点（SSE）
   */
  static executeNode(payload: { workflow: any; nodeId: string; config?: any }) {
    logger.debug('Executing workflow node', { nodeId: payload.nodeId })
    const controller = root.get(WorkflowController)
    return controller.executeNode(payload)
  }

  /**
   * 获取所有可用节点类型
   */
  static async getAvailableNodes() {
    logger.debug('Fetching available workflow nodes')
    const controller = root.get(WorkflowController)
    return controller.getAvailableNodes()
  }

  /**
   * 创建工作流运行实例
   */
  static async createRun(workflowId: string, inputs?: Record<string, unknown>) {
    logger.debug('Creating workflow run', { workflowId })
    const controller = root.get(WorkflowController)
    return controller.createRun({ workflowId, inputs })
  }

  /**
   * 执行运行实例
   */
  static async executeRun(runId: string) {
    logger.debug('Executing workflow run', { runId })
    const controller = root.get(WorkflowController)
    return controller.executeRun({ runId })
  }

  /**
   * 获取运行实例详情
   */
  static async getRun(runId: string) {
    logger.debug('Fetching workflow run', { runId })
    const controller = root.get(WorkflowController)
    return controller.getRun(runId)
  }

  /**
   * 列出工作流运行历史
   */
  static async listRuns(params: {
    workflowId: string
    page?: number
    pageSize?: number
    status?: RunStatus
    scheduleId?: string
  }) {
    logger.debug('Listing workflow runs', params)
    const controller = root.get(WorkflowController)
    return controller.listRuns(params)
  }

  /**
   * 取消运行实例
   */
  static async cancelRun(runId: string) {
    logger.debug('Canceling workflow run', { runId })
    const controller = root.get(WorkflowController)
    return controller.cancelRun({ runId })
  }

  // ================ 调度相关方法 ================

  /**
   * 创建调度
   */
  static async createSchedule(workflowName: string, params: {
    name: string
    scheduleType: string
    cronExpression?: string
    intervalSeconds?: number
    inputs?: Record<string, unknown>
    startTime?: Date
    endTime?: Date
  }) {
    logger.debug('Creating workflow schedule', { workflowName, scheduleName: params.name })
    const controller = root.get(WorkflowController)
    return controller.createSchedule(workflowName, params)
  }

  /**
   * 列出调度
   */
  static async listSchedules(workflowName: string) {
    logger.debug('Listing workflow schedules', { workflowName })
    const controller = root.get(WorkflowController)
    return controller.listSchedules(workflowName)
  }

  /**
   * 获取调度详情
   */
  static async getSchedule(scheduleId: string) {
    logger.debug('Fetching workflow schedule', { scheduleId })
    const controller = root.get(WorkflowController)
    return controller.getSchedule(scheduleId)
  }

  /**
   * 更新调度
   */
  static async updateSchedule(scheduleId: string, params: any) {
    logger.debug('Updating workflow schedule', { scheduleId })
    const controller = root.get(WorkflowController)
    return controller.updateSchedule(scheduleId, params)
  }

  /**
   * 删除调度
   */
  static async deleteSchedule(scheduleId: string) {
    logger.debug('Deleting workflow schedule', { scheduleId })
    const controller = root.get(WorkflowController)
    return controller.deleteSchedule(scheduleId)
  }

  /**
   * 启用调度
   */
  static async enableSchedule(scheduleId: string) {
    logger.debug('Enabling workflow schedule', { scheduleId })
    const controller = root.get(WorkflowController)
    return controller.enableSchedule(scheduleId)
  }

  /**
   * 禁用调度
   */
  static async disableSchedule(scheduleId: string) {
    logger.debug('Disabling workflow schedule', { scheduleId })
    const controller = root.get(WorkflowController)
    return controller.disableSchedule(scheduleId)
  }

  /**
   * 手动触发调度
   */
  static async triggerSchedule(scheduleId: string, inputs?: Record<string, unknown>) {
    logger.debug('Triggering workflow schedule', { scheduleId })
    const controller = root.get(WorkflowController)
    return controller.triggerSchedule(scheduleId, { inputs })
  }

  /**
   * 节点微调 - 基于响应式流的智能重放（SSE）
   */
  static fineTuneNode(runId: string, nodeId: string, config: any) {
    logger.debug('Fine-tuning workflow node', { runId, nodeId })
    const controller = root.get(WorkflowController)
    return controller.fineTuneNode(runId, nodeId, { config })
  }

  // ================ 自定义方法（SDK 不支持） ================

  /**
   * 爬取单个帖子的详情（包括评论和转发）
   * 注意：此方法在 SDK 中不存在，保留原有实现
   */
  static async crawlPost(request: CrawlPostRequest): Promise<WorkflowApiResponse<CrawlPostData>> {
    logger.warn('crawlPost not supported by WorkflowController, API may not exist')
    throw new Error('crawlPost is not implemented in SDK')
  }

  /**
   * 触发单个帖子的 NLP 分析
   * 注意：此方法在 SDK 中不存在，保留原有实现
   */
  static async triggerNLP(request: TriggerNLPRequest): Promise<WorkflowApiResponse> {
    logger.warn('triggerNLP not supported by WorkflowController, API may not exist')
    throw new Error('triggerNLP is not implemented in SDK')
  }

  /**
   * 批量触发 NLP 分析
   * 注意：此方法在 SDK 中不存在，保留原有实现
   */
  static async batchNLP(request: BatchNLPRequest): Promise<WorkflowApiResponse> {
    logger.warn('batchNLP not supported by WorkflowController, API may not exist')
    throw new Error('batchNLP is not implemented in SDK')
  }

  /**
   * 执行微博关键词搜索
   * 注意：此方法在 SDK 中不存在，保留原有实现
   */
  static async searchWeibo(request: WeiboSearchRequest): Promise<WorkflowApiResponse> {
    logger.warn('searchWeibo not supported by WorkflowController, API may not exist')
    throw new Error('searchWeibo is not implemented in SDK')
  }

  /**
   * 获取工作流状态
   * 注意：此方法在 SDK 中不存在，保留原有实现
   */
  static async getStatus(): Promise<WorkflowStatusResponse> {
    logger.warn('getStatus not supported by WorkflowController, API may not exist')
    throw new Error('getStatus is not implemented in SDK')
  }
}

// 默认导出
export default WorkflowAPI
