import { Controller, Get, Query } from '@nestjs/common';
import { root } from '@sker/core';
import { LlmChatLogService } from '../services/llm-chat-log.service';
import * as sdk from '@sker/sdk';

@Controller('api/llm-chat-logs')
export class LlmChatLogsController implements sdk.LlmChatLogsController {
  private service: LlmChatLogService;

  constructor() {
    this.service = root.get(LlmChatLogService);
  }

  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity?: 'minute' | 'hour' | 'day'
  ): Promise<sdk.LlmChatLogStats> {
    return this.service.getStats(startDate, endDate, granularity);
  }

  @Get()
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
