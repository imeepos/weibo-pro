import { Controller, Post, Body, Get, Query, Delete } from '@sker/core'
import type {
  WorkflowStatus,
  SearchWeiboResult,
  BatchNlpResult,
  CrawlPostResult,
  WorkflowData,
  WorkflowSummary,
  CreateShareResult,
} from '../types'
import type { WorkflowGraphAst } from '@sker/workflow';
import type { WorkflowEntity } from '@sker/entities';
@Controller('api/workflow')
export class WorkflowController {

  @Post('trigger-nlp')
  triggerNlpAnalysis(@Body() body: { postId: string }): Promise<{ message: string; postId: string }> {
    throw new Error('method triggerNlpAnalysis not implements')
  }

  @Post('search-weibo')
  searchWeibo(@Body() body: {
    keyword: string;
    startDate: string;
    endDate: string;
    page?: number;
  }): Promise<SearchWeiboResult> {
    throw new Error('method searchWeibo not implements')
  }

  @Get('status')
  getWorkflowStatus(): Promise<WorkflowStatus> {
    throw new Error('method getWorkflowStatus not implements')
  }

  @Post('batch-nlp')
  batchTriggerNlp(@Body() body: { postIds: string[] }): Promise<BatchNlpResult> {
    throw new Error('method batchTriggerNlp not implements')
  }

  @Post('crawl-post')
  crawlPost(@Body() body: { postId: string }): Promise<CrawlPostResult> {
    throw new Error('method crawlPost not implements')
  }

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

  @Post('share')
  createShare(@Body() body: { workflowId: string; expiresAt?: string }): Promise<CreateShareResult> {
    throw new Error('method createShare not implements')
  }

  @Get('shared/:token')
  getSharedWorkflow(@Query() params: { token: string }): Promise<WorkflowData | null> {
    throw new Error('method getSharedWorkflow not implements')
  }

  @Post('execute-node')
  executeNode(@Body() body: WorkflowGraphAst): Promise<WorkflowGraphAst> {
    throw new Error('method executeNode not implements')
  }
}