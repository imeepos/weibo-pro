import { Injectable } from '@sker/core';
import type { LlmChatLogStats, LlmChatLogListResult, PromptAnalysisResult } from '@sker/sdk';
import { getChatLogStats, listChatLogs } from './llm-chat-log.queries';
import { analyzePrompts } from './llm-chat-log.prompts';

@Injectable({ providedIn: 'root' })
export class LlmChatLogService {
  async getStats(startDate?: string, endDate?: string, granularity?: 'minute' | 'hour' | 'day'): Promise<LlmChatLogStats> {
    return getChatLogStats(startDate, endDate, granularity);
  }

  async list(
    startDate?: string,
    endDate?: string,
    modelName?: string,
    providerId?: string,
    isSuccess?: boolean,
    page = 1,
    pageSize = 20
  ): Promise<LlmChatLogListResult> {
    return listChatLogs(startDate, endDate, modelName, providerId, isSuccess, page, pageSize);
  }

  async analyzePrompts(
    startDate?: string,
    endDate?: string,
    modelName?: string,
    providerId?: string
  ): Promise<PromptAnalysisResult> {
    return analyzePrompts(startDate, endDate, modelName, providerId);
  }
}
