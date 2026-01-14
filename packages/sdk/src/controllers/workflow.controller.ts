import { Controller, Post, Body, Get, Query, Delete, Param, Put } from '@sker/core'
import type {
  WorkflowSummary,
  CreateRunResult,
  ListRunsResult,
  WorkflowRunEntity,
  RunStatus,
} from '../types'

import { Observable } from 'rxjs'
import type { WorkflowGraphAst, Ast, INode, NodeEvent } from '@sker/workflow';
import type { WorkflowEntity, WorkflowScheduleEntity } from '@sker/entities';

export interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}

export interface WorkflowTemplate {
  name: string;
  description: string;
}

export interface InitWorkflowResponse {
  template?: WorkflowGraphAst;
}

export interface ExecuteWorkflowPayload {
  ast?: Ast;
  workflow?: WorkflowGraphAst,
  input?: Record<string, any>;
}

export interface ExecuteNodePayload {
  workflow: INode;
  nodeId: string;
  config?: any;
}

export interface FineTunePayload {
  config: any;
}

export interface WorkflowNodeInfo {
  type: string;
  title: string;
  nodeType: string;
  description?: string;
}
@Controller('workflow')
export class WorkflowController {
  @Post('save')
  saveWorkflow(@Body() body: WorkflowGraphAst): Promise<WorkflowEntity> {
    throw new Error('method saveWorkflow not implements')
  }

  @Get('get')
  getWorkflow(@Query() params: { name: string }): Promise<WorkflowGraphAst | null> {
    throw new Error('method getWorkflow not implements')
  }

  @Get('list')
  listWorkflows(): Promise<WorkflowSummary[]> {
    throw new Error('method listWorkflows not implements')
  }

  @Get('init')
  initWorkflow(@Query() params: { name: string }): Promise<InitWorkflowResponse> {
    throw new Error('method initWorkflow not implements')
  }

  @Get('templates')
  listTemplates(): Promise<WorkflowTemplate[]> {
    throw new Error('method listTemplates not implements')
  }

  @Delete('deleteWorkflow')
  deleteWorkflow(@Body() params: { id: string }): Promise<{ success: boolean }> {
    throw new Error('method deleteWorkflow not implements')
  }

  @Post({ path: 'execute', sse: true })
  execute(@Body() body: ExecuteWorkflowPayload): Observable<NodeEvent> {
    throw new Error('method execute not implements')
  }

  /**
   * 创建工作流运行实例
   */
  @Post('createRun')
  createRun(@Body() body: { workflowId: string; inputs?: Record<string, unknown> }): Promise<CreateRunResult> {
    throw new Error('method createRun not implements')
  }

  /**
   * 执行工作流运行实例
   */
  @Post('executeRun')
  executeRun(@Body() body: { runId: string }): Promise<WorkflowRunEntity> {
    throw new Error('method executeRun not implements')
  }

  /**
   * 获取运行实例详情
   */
  @Get('getRun')
  getRun(@Query('runId') runId: string): Promise<WorkflowRunEntity> {
    throw new Error('method getRun not implements')
  }

  /**
   * 列出工作流的运行历史
   */
  @Get('listRuns')
  listRuns(
    @Query() query: {
      workflowId: string;
      page?: number;
      pageSize?: number;
      status?: RunStatus;
      scheduleId?: string;
    },
  ): Promise<ListRunsResult> {
    throw new Error('method listRuns not implements')
  }

  /**
   * 取消运行实例
   */
  @Post('cancelRun')
  cancelRun(@Body() body: { runId: string }): Promise<{ success: boolean }> {
    throw new Error('method cancelRun not implements')
  }

  // ========== 调度相关方法 ==========

  /**
   * 创建调度
   */
  @Post('createSchedule')
  createSchedule(
    @Body() body: {
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
    throw new Error('method createSchedule not implements')
  }

  /**
   * 列出调度
   */
  @Get('listSchedules')
  listSchedules(@Query('name') workflowName: string): Promise<WorkflowScheduleEntity[]> {
    throw new Error('method listSchedules not implements')
  }

  /**
   * 获取调度详情
   */
  @Get('getSchedule')
  getSchedule(@Query('scheduleId') scheduleId: string): Promise<WorkflowScheduleEntity> {
    throw new Error('method getSchedule not implements')
  }

  /**
   * 更新调度
   */
  @Put('updateSchedule')
  updateSchedule(
    @Query('scheduleId') scheduleId: string,
    @Body() body: {
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
    throw new Error('method updateSchedule not implements')
  }

  /**
   * 删除调度
   */
  @Post('deleteSchedule')
  deleteSchedule(@Body('scheduleId') scheduleId: string): Promise<{ success: boolean }> {
    throw new Error('method deleteSchedule not implements')
  }

  /**
   * 启用调度
   */
  @Post('enableSchedule')
  enableSchedule(@Body('scheduleId') scheduleId: string): Promise<WorkflowScheduleEntity> {
    throw new Error('method enableSchedule not implements')
  }

  /**
   * 禁用调度
   */
  @Post('disableSchedule')
  disableSchedule(@Body('scheduleId') scheduleId: string): Promise<WorkflowScheduleEntity> {
    throw new Error('method disableSchedule not implements')
  }

  /**
   * 手动触发调度
   * 返回 runId，后台异步执行
   */
  @Post('triggerSchedule')
  triggerSchedule(
    @Query('scheduleId') scheduleId: string,
    @Body() body?: { inputs?: Record<string, unknown> }
  ): Promise<{ success: boolean; runId: string }> {
    throw new Error('method triggerSchedule not implements')
  }

  /**
   * 执行单个节点 - 微调执行
   */
  @Post({ path: 'executeNode', sse: true })
  executeNode(@Body() body: ExecuteNodePayload): Observable<NodeEvent> {
    throw new Error('method executeNode not implements')
  }

  /**
   * 节点微调 - 基于响应式流的智能重放
   */
  @Post({ path: `fineTuneNode`, sse: true })
  fineTuneNode(
    @Query('runId') runId: string,
    @Query('nodeId') nodeId: string,
    @Body() body: FineTunePayload,
  ): Observable<NodeEvent> {
    throw new Error('method fineTuneNode not implements')
  }

  /**
   * 获取所有可用节点类型
   */
  @Get('getAvailableNodes')
  getAvailableNodes(): Promise<WorkflowNodeInfo[]> {
    throw new Error('method getAvailableNodes not implements')
  }
}