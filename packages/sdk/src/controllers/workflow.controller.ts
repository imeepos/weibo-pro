import { Controller, Post, Body, Get } from '@sker/core'

@Controller('api/workflow')
export class WorkflowController {

  @Post('trigger-nlp')
  triggerNlpAnalysis(@Body() body: { postId: string }): Promise<any> {
    throw new Error('method triggerNlpAnalysis not implements')
  }

  @Post('search-weibo')
  searchWeibo(@Body() body: {
    keyword: string;
    startDate: string;
    endDate: string;
    page?: number;
  }): Promise<any> {
    throw new Error('method searchWeibo not implements')
  }

  @Get('status')
  getWorkflowStatus(): Promise<any> {
    throw new Error('method getWorkflowStatus not implements')
  }

  @Post('batch-nlp')
  batchTriggerNlp(@Body() body: { postIds: string[] }): Promise<any> {
    throw new Error('method batchTriggerNlp not implements')
  }

  @Post('crawl-post')
  crawlPost(@Body() body: { postId: string }): Promise<any> {
    throw new Error('method crawlPost not implements')
  }
}