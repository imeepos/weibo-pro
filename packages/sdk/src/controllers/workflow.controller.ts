import { Controller, Post, Body, Get, Query, Delete } from '@sker/core'
import type {
  WorkflowStatus,
  SearchWeiboResult,
  BatchNlpResult,
  CrawlPostResult,
  WorkflowData,
  WorkflowSummary,
  CreateShareResult,
  CreateRunResult,
  ListRunsResult,
  WorkflowRunEntity,
  RunStatus,
} from '../types'
import { Observable } from 'rxjs'
import type { WorkflowGraphAst, Ast, INode } from '@sker/workflow';
import type { WorkflowEntity } from '@sker/entities';
@Controller('api/workflow')
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

  @Delete('delete/:id')
  deleteWorkflow(@Query() params: { id: string }): Promise<{ success: boolean }> {
    throw new Error('method deleteWorkflow not implements')
  }

  @Post('execute')
  execute(@Body() body: INode): Observable<INode> {
    throw new Error('method executeNode not implements')
  }

  /**
   * 创建工作流运行实例
   */
  @Post(':id/runs')
  createRun(@Body() body: { workflowId: number; inputs?: Record<string, unknown> }): Promise<CreateRunResult> {
    throw new Error('method createRun not implements')
  }

  /**
   * 执行工作流运行实例
   */
  @Post('runs/:runId/execute')
  executeRun(@Body() body: { runId: number }): Promise<WorkflowRunEntity> {
    throw new Error('method executeRun not implements')
  }

  /**
   * 获取运行实例详情
   */
  @Get('runs/:runId')
  getRun(@Body() body: { runId: number }): Promise<WorkflowRunEntity> {
    throw new Error('method getRun not implements')
  }

  /**
   * 列出工作流的运行历史
   */
  @Get(':id/runs')
  listRuns(
    @Query() query: {
      workflowId: number;
      page?: number;
      pageSize?: number;
      status?: RunStatus;
    },
  ): Promise<ListRunsResult> {
    throw new Error('method listRuns not implements')
  }

  /**
   * 取消运行实例
   */
  @Post('runs/:runId/cancel')
  cancelRun(@Body() body: { runId: number }): Promise<{ success: boolean }> {
    throw new Error('method cancelRun not implements')
  }
}