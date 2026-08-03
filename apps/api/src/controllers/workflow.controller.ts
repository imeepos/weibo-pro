import { Controller, Body, Query, Param } from '@sker/core';
import { Observable } from 'rxjs';
import { INode, NodeEvent, WorkflowGraphAst } from '@sker/workflow';
import * as sdk from '@sker/sdk';
import { WorkflowEntity, WorkflowRunEntity, WorkflowScheduleEntity, RunStatus } from '@sker/entities';
import { WorkflowCrudHandler } from './workflow/workflow-crud.handler';
import { WorkflowExecuteHandler } from './workflow/workflow-execute.handler';
import { WorkflowRunHandler } from './workflow/workflow-run.handler';
import { WorkflowScheduleHandler } from './workflow/workflow-schedule.handler';
import { WorkflowNodeHandler } from './workflow/workflow-node.handler';

/**
 * 爬虫工作流触发控制器
 *
 * 存在即合理：
 * - 提供优雅的API端点触发爬虫工作流
 * - 支持多种触发方式：NLP分析、微博搜索
 * - 集成消息队列，确保任务可靠执行
 * - 管理工作流的持久化和分享
 */
@Controller(sdk.WorkflowController)
export class WorkflowController implements sdk.WorkflowController {
  private readonly crud: WorkflowCrudHandler;
  private readonly executeHandler: WorkflowExecuteHandler;
  private readonly runs: WorkflowRunHandler;
  private readonly schedules: WorkflowScheduleHandler;
  private readonly nodes: WorkflowNodeHandler;

  constructor() {
    this.crud = new WorkflowCrudHandler();
    this.executeHandler = new WorkflowExecuteHandler();
    this.runs = new WorkflowRunHandler();
    this.schedules = new WorkflowScheduleHandler(this.runs);
    this.nodes = new WorkflowNodeHandler();
  }

  /**
   * 保存工作流
   */
  async saveWorkflow(@Body() body: WorkflowGraphAst): Promise<WorkflowEntity> {
    return this.crud.saveWorkflow(body);
  }

  async initWorkflow(@Query() params: { name: string }): Promise<sdk.InitWorkflowResponse> {
    return this.crud.initWorkflow(params);
  }

  /**
   * 根据 name 获取工作流
   */
  async getWorkflow(@Query() params: { name: string }): Promise<WorkflowGraphAst | null> {
    return this.crud.getWorkflow(params);
  }

  /**
   * 列出所有可用的工作流模板
   */
  async listTemplates(): Promise<{ name: string; description: string }[]> {
    return this.crud.listTemplates();
  }

  /**
   * 列出所有工作流
   */
  async listWorkflows(): Promise<sdk.WorkflowSummary[]> {
    return this.crud.listWorkflows();
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(@Query() params: { id: string }): Promise<{ success: boolean }> {
    return this.crud.deleteWorkflow(params);
  }

  /**
   * 执行工作流 - POST SSE版本
   */
  execute(
    @Body() body: sdk.ExecuteWorkflowPayload,
  ): Observable<NodeEvent> {
    return this.executeHandler.execute(body);
  }

  /**
   * 微调执行工作流的一个节点 - 轻量级单节点执行
   */
  executeNode(
    @Body() body: { workflow: INode, nodeId: string, config?: any }
  ): Observable<NodeEvent> {
    return this.executeHandler.executeNode(body);
  }

  /**
   * 创建工作流运行实例
   */
  async createRun(
    @Body() body: { workflowId: string; inputs?: Record<string, unknown> },
  ): Promise<{ runId: string; run: WorkflowRunEntity }> {
    return this.runs.createRun(body);
  }

  /**
   * 执行工作流运行实例
   */
  async executeRun(@Body() body: { runId: string }): Promise<WorkflowRunEntity> {
    return this.runs.executeRun(body);
  }

  /**
   * 获取运行实例详情
   */
  async getRun(@Param('runId') runId: string): Promise<WorkflowRunEntity> {
    return this.runs.getRun(runId);
  }

  /**
   * 列出工作流的运行历史
   */
  async listRuns(
    @Query()
    query: {
      workflowId: string;
      page?: number;
      pageSize?: number;
      status?: RunStatus;
    },
  ): Promise<{ runs: WorkflowRunEntity[]; total: number; page: number; pageSize: number }> {
    return this.runs.listRuns(query);
  }

  /**
   * 取消运行实例
   */
  async cancelRun(@Body() body: { runId: string }): Promise<{ success: boolean }> {
    return this.runs.cancelRun(body);
  }

  /**
   * 节点微调 - 基于响应式流的智能重放
   */
  fineTuneNode(
    @Param('runId') runId: string,
    @Param('nodeId') nodeId: string,
    @Body() body: { config: any },
  ): Observable<NodeEvent> {
    return this.executeHandler.fineTuneNode(runId, nodeId, body);
  }

  /**
   * 创建调度
   */
  async createSchedule(
    @Body()
    body: {
      code: string;
      name: string;
      scheduleType: string;
      cronExpression?: string;
      intervalSeconds?: number;
      inputs?: Record<string, unknown>;
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<WorkflowScheduleEntity> {
    return this.schedules.createSchedule(body);
  }

  /**
   * 列出调度
   */
  async listSchedules(@Param('name') workflowName: string): Promise<WorkflowScheduleEntity[]> {
    return this.schedules.listSchedules(workflowName);
  }

  /**
   * 获取调度详情
   */
  async getSchedule(@Param('scheduleId') scheduleId: string): Promise<WorkflowScheduleEntity> {
    return this.schedules.getSchedule(scheduleId);
  }

  /**
   * 更新调度
   */
  async updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body()
    body: {
      name?: string;
      scheduleType?: string;
      cronExpression?: string;
      intervalSeconds?: number;
      inputs?: Record<string, unknown>;
      startTime?: Date;
      endTime?: Date;
      status?: string;
    }
  ): Promise<WorkflowScheduleEntity> {
    return this.schedules.updateSchedule(scheduleId, body);
  }

  /**
   * 删除调度
   */
  async deleteSchedule(@Param('scheduleId') scheduleId: string): Promise<{ success: boolean }> {
    return this.schedules.deleteSchedule(scheduleId);
  }

  /**
   * 启用调度
   */
  async enableSchedule(@Param('scheduleId') scheduleId: string): Promise<WorkflowScheduleEntity> {
    return this.schedules.enableSchedule(scheduleId);
  }

  /**
   * 禁用调度
   */
  async disableSchedule(@Param('scheduleId') scheduleId: string): Promise<WorkflowScheduleEntity> {
    return this.schedules.disableSchedule(scheduleId);
  }

  /**
   * 手动触发调度
   */
  async triggerSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() body?: { inputs?: Record<string, unknown> }
  ): Promise<{ success: boolean; runId: string }> {
    return this.schedules.triggerSchedule(scheduleId, body);
  }

  /**
   * 获取所有可用节点类型
   */
  async getAvailableNodes(): Promise<sdk.WorkflowNodeInfo[]> {
    return this.nodes.getAvailableNodes();
  }
}
