import { Controller, Get, Query } from '@sker/core';
import { root } from '@sker/core';
import { LlmChatLogService } from '../services/llm-chat-log.service';
import * as sdk from '@sker/sdk';

@Controller(sdk.LlmChatLogsController)
export class LlmChatLogsController implements sdk.LlmChatLogsController {
  private service: LlmChatLogService;

  constructor() {
    this.service = root.get(LlmChatLogService);
  }

  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity?: 'minute' | 'hour' | 'day'
  ): Promise<sdk.LlmChatLogStats> {
    return this.service.getStats(startDate, endDate, granularity);
  }

  async analyzePrompts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('modelName') modelName?: string,
    @Query('providerId') providerId?: string
  ): Promise<sdk.PromptAnalysisResult> {
    return this.service.analyzePrompts(startDate, endDate, modelName, providerId);
  }

  async list(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('modelName') modelName?: string,
    @Query('providerId') providerId?: string,
    @Query('isSuccess') isSuccess?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ): Promise<sdk.LlmChatLogListResult> {
    return this.service.list(
      startDate,
      endDate,
      modelName,
      providerId,
      isSuccess === undefined ? undefined : isSuccess === 'true',
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20
    );
  }
}
