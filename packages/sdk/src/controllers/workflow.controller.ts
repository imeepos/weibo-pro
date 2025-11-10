import { Controller, Post, Body, Get } from '@sker/core'
import type {
  WorkflowStatus,
  SearchWeiboResult,
  BatchNlpResult,
  CrawlPostResult
} from '../types'

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
}