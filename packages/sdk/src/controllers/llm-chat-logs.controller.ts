import { Controller, Get, Query } from '@sker/core';

export interface LlmChatLogStats {
  totalRequests: number;
  successCount: number;
  failCount: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  avgDurationMs: number;
  byModel: Array<{
    modelName: string;
    count: number;
    successRate: number;
    tokens: number;
  }>;
  byProvider: Array<{
    providerId: string;
    providerName: string;
    count: number;
    successRate: number;
    tokens: number;
  }>;
  byStatusCode: Array<{
    statusCode: number;
    count: number;
  }>;
  byTime: Array<{
    date: string;
    count: number;
    tokens: number;
  }>;
}

export interface LlmChatLogQuery {
  startDate?: string;
  endDate?: string;
  modelName?: string;
  providerId?: string;
  isSuccess?: boolean;
  page?: number;
  pageSize?: number;
}

export interface LlmChatLogItem {
  id: string;
  providerId: string;
  providerName?: string;
  modelName: string;
  durationMs: number;
  isSuccess: boolean;
  statusCode: number;
  error?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  createdAt: string;
}

export interface LlmChatLogListResult {
  items: LlmChatLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

@Controller('api/llm-chat-logs')
export class LlmChatLogsController {
  @Get('stats')
  getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity?: 'minute' | 'hour' | 'day'
  ): Promise<LlmChatLogStats> {
    throw new Error('method getStats not implements');
  }

  @Get()
  list(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('modelName') modelName?: string,
    @Query('providerId') providerId?: string,
    @Query('isSuccess') isSuccess?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ): Promise<LlmChatLogListResult> {
    throw new Error('method list not implements');
  }
}
