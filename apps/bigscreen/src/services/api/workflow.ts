/**
 * 工作流 API 服务
 * 基于 @sker/sdk WorkflowController 的统一封装
 */

import { root } from '@sker/core'
import { WorkflowController, type WorkflowSummary, type WorkflowGraphAst, RunStatus } from '@sker/sdk'
import { createLogger } from '@/utils'
import type {
  TriggerNLPRequest,
  CrawlPostRequest,
  CrawlPostData,
  BatchNLPRequest,
  WeiboSearchRequest,
  WorkflowStatusResponse,
  WorkflowApiResponse,
} from './workflow.types'

export type {
  TriggerNLPRequest,
  CrawlPostRequest,
  CrawlPostData,
  BatchNLPRequest,
  WeiboSearchRequest,
  WorkflowStatusResponse,
  WorkflowApiResponse,
} from './workflow.types'

const logger = createLogger('WorkflowAPI')

// ================ API 服务类 ================

export class WorkflowAPI {
  private static getController() {
    return root.get(WorkflowController)
  }

  /**
   * 获取工作流列表
   */
  static async listWorkflows(): Promise<WorkflowSummary[]> {
    logger.debug('Fetching workflow list')
    return this.getController().listWorkflows()
  }

  /**
   * 获取工作流详情
   */
  static async getWorkflow(name: string): Promise<WorkflowGraphAst | null> {
    logger.debug('Fetching workflow', { name })
    return this.getController().getWorkflow({ name })
  }

  /**
   * 保存工作流
   */
  static async saveWorkflow(workflow: WorkflowGraphAst) {
    logger.debug('Saving workflow', { name: workflow.name })
    return this.getController().saveWorkflow(workflow)
  }

  /**
   * 删除工作流
   */
  static async deleteWorkflow(id: string): Promise<{ success: boolean }> {
    logger.debug('Deleting workflow', { id })
    return this.getController().deleteWorkflow({ id })
  }

  /**
   * 获取工作流模板列表
   */
  static async listTemplates() {
    logger.debug('Fetching workflow templates')
    return this.getController().listTemplates()
  }

  /**
   * 初始化工作流
   */
  static async initWorkflow(name: string) {
    logger.debug('Initializing workflow', { name })
    return this.getController().initWorkflow({ name })
  }

  /**
   * 执行工作流（SSE）
   */
  static executeWorkflow(payload: { ast: any; workflow: WorkflowGraphAst; input?: Record<string, any> }) {
    logger.debug('Executing workflow', { workflowName: payload.workflow.name })
    return this.getController().execute(payload)
  }

  /**
   * 执行单个节点（SSE）
   */
  static executeNode(payload: { workflow: any; nodeId: string; config?: any }) {
    logger.debug('Executing workflow node', { nodeId: payload.nodeId })
    return this.getController().executeNode(payload)
  }

  /**
   * 获取所有可用节点类型
   */
  static async getAvailableNodes() {
    logger.debug('Fetching available workflow nodes')
    return this.getController().getAvailableNodes()
  }

  /**
   * 创建工作流运行实例
   */
  static async createRun(workflowId: string, inputs?: Record<string, unknown>) {
    logger.debug('Creating workflow run', { workflowId })
    return this.getController().createRun({ workflowId, inputs })
  }

  /**
   * 执行运行实例
   */
  static async executeRun(runId: string) {
    logger.debug('Executing workflow run', { runId })
    return this.getController().executeRun({ runId })
  }

  /**
   * 获取运行实例详情
   */
  static async getRun(runId: string) {
    logger.debug('Fetching workflow run', { runId })
    return this.getController().getRun(runId)
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
    return this.getController().listRuns(params)
  }

  /**
   * 取消运行实例
   */
  static async cancelRun(runId: string) {
    logger.debug('Canceling workflow run', { runId })
    return this.getController().cancelRun({ runId })
  }

  // ================ 调度相关方法 ================

  /**
   * 创建调度
   */
  static async createSchedule(params: {
    code: string;
    name: string
    scheduleType: string
    cronExpression?: string
    intervalSeconds?: number
    inputs?: Record<string, unknown>
    startTime?: Date
    endTime?: Date
  }) {
    return this.getController().createSchedule(params)
  }

  /**
   * 列出调度
   */
  static async listSchedules(workflowName: string) {
    logger.debug('Listing workflow schedules', { workflowName })
    return this.getController().listSchedules(workflowName)
  }

  /**
   * 获取调度详情
   */
  static async getSchedule(scheduleId: string) {
    logger.debug('Fetching workflow schedule', { scheduleId })
    return this.getController().getSchedule(scheduleId)
  }

  /**
   * 更新调度
   */
  static async updateSchedule(scheduleId: string, params: any) {
    logger.debug('Updating workflow schedule', { scheduleId })
    return this.getController().updateSchedule(scheduleId, params)
  }

  /**
   * 删除调度
   */
  static async deleteSchedule(scheduleId: string) {
    logger.debug('Deleting workflow schedule', { scheduleId })
    return this.getController().deleteSchedule(scheduleId)
  }

  /**
   * 启用调度
   */
  static async enableSchedule(scheduleId: string) {
    logger.debug('Enabling workflow schedule', { scheduleId })
    return this.getController().enableSchedule(scheduleId)
  }

  /**
   * 禁用调度
   */
  static async disableSchedule(scheduleId: string) {
    logger.debug('Disabling workflow schedule', { scheduleId })
    return this.getController().disableSchedule(scheduleId)
  }

  /**
   * 手动触发调度
   */
  static async triggerSchedule(scheduleId: string, inputs?: Record<string, unknown>) {
    logger.debug('Triggering workflow schedule', { scheduleId })
    return this.getController().triggerSchedule(scheduleId, { inputs })
  }

  /**
   * 节点微调 - 基于响应式流的智能重放（SSE）
   */
  static fineTuneNode(runId: string, nodeId: string, config: any) {
    logger.debug('Fine-tuning workflow node', { runId, nodeId })
    return this.getController().fineTuneNode(runId, nodeId, { config })
  }

  // ================ 自定义方法（SDK 不支持） ================

  /**
   * 爬取单个帖子的详情（包括评论和转发）
   * 注意：此方法在 SDK 中不存在，保留原有实现
   */
  static async crawlPost(_request: CrawlPostRequest): Promise<WorkflowApiResponse<CrawlPostData>> {
    logger.warn('crawlPost not supported by WorkflowController, API may not exist')
    throw new Error('crawlPost is not implemented in SDK')
  }

  /**
   * 触发单个帖子的 NLP 分析
   * 注意：此方法在 SDK 中不存在，保留原有实现
   */
  static async triggerNLP(_request: TriggerNLPRequest): Promise<WorkflowApiResponse> {
    logger.warn('triggerNLP not supported by WorkflowController, API may not exist')
    throw new Error('triggerNLP is not implemented in SDK')
  }

  /**
   * 批量触发 NLP 分析
   * 注意：此方法在 SDK 中不存在，保留原有实现
   */
  static async batchNLP(_request: BatchNLPRequest): Promise<WorkflowApiResponse> {
    logger.warn('batchNLP not supported by WorkflowController, API may not exist')
    throw new Error('batchNLP is not implemented in SDK')
  }

  /**
   * 执行微博关键词搜索
   * 注意：此方法在 SDK 中不存在，保留原有实现
   */
  static async searchWeibo(_request: WeiboSearchRequest): Promise<WorkflowApiResponse> {
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
