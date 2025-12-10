import { Injectable } from '@sker/core';
import { LlmChatLog, LlmProvider, useEntityManager } from '@sker/entities';
import type { LlmChatLogStats, LlmChatLogListResult, LlmChatLogItem } from '@sker/sdk';
import { Between, Like } from 'typeorm';

@Injectable({ providedIn: 'root' })
export class LlmChatLogService {
  async getStats(startDate?: string, endDate?: string): Promise<LlmChatLogStats> {
    return useEntityManager(async m => {
      const where: any = {};
      if (startDate && endDate) {
        where.createdAt = Between(new Date(startDate), new Date(endDate));
      }

      const logs = await m.find(LlmChatLog, { where });
      const providers = await m.find(LlmProvider);
      const providerMap = new Map(providers.map(p => [p.id, p.name]));

      const totalRequests = logs.length;
      const successCount = logs.filter(l => l.isSuccess).length;
      const failCount = totalRequests - successCount;
      const totalPromptTokens = logs.reduce((sum, l) => sum + (l.promptTokens || 0), 0);
      const totalCompletionTokens = logs.reduce((sum, l) => sum + (l.completionTokens || 0), 0);
      const totalTokens = logs.reduce((sum, l) => sum + (l.totalTokens || 0), 0);
      const avgDurationMs = totalRequests > 0
        ? Math.round(logs.reduce((sum, l) => sum + l.durationMs, 0) / totalRequests)
        : 0;

      // 按模型统计
      const modelStats = new Map<string, { count: number; success: number; tokens: number }>();
      logs.forEach(l => {
        const stat = modelStats.get(l.modelName) || { count: 0, success: 0, tokens: 0 };
        stat.count++;
        if (l.isSuccess) stat.success++;
        stat.tokens += l.totalTokens || 0;
        modelStats.set(l.modelName, stat);
      });

      // 按提供商统计
      const providerStats = new Map<string, { count: number; success: number; tokens: number }>();
      logs.forEach(l => {
        const stat = providerStats.get(l.providerId) || { count: 0, success: 0, tokens: 0 };
        stat.count++;
        if (l.isSuccess) stat.success++;
        stat.tokens += l.totalTokens || 0;
        providerStats.set(l.providerId, stat);
      });

      // 按状态码统计
      const statusCodeStats = new Map<number, number>();
      logs.forEach(l => {
        statusCodeStats.set(l.statusCode, (statusCodeStats.get(l.statusCode) || 0) + 1);
      });

      // 按时间统计
      const timeStats = new Map<string, { count: number; tokens: number }>();
      logs.forEach(l => {
        const date = l.createdAt.toISOString().split('T')[0];
        const stat = timeStats.get(date) || { count: 0, tokens: 0 };
        stat.count++;
        stat.tokens += l.totalTokens || 0;
        timeStats.set(date, stat);
      });

      return {
        totalRequests,
        successCount,
        failCount,
        totalPromptTokens,
        totalCompletionTokens,
        totalTokens,
        avgDurationMs,
        byModel: Array.from(modelStats.entries())
          .map(([modelName, stat]) => ({
            modelName,
            count: stat.count,
            successRate: stat.count > 0 ? Math.round(stat.success / stat.count * 100) : 0,
            tokens: stat.tokens,
          }))
          .sort((a, b) => b.count - a.count),
        byProvider: Array.from(providerStats.entries())
          .map(([providerId, stat]) => ({
            providerId,
            providerName: providerMap.get(providerId) || providerId,
            count: stat.count,
            successRate: stat.count > 0 ? Math.round(stat.success / stat.count * 100) : 0,
            tokens: stat.tokens,
          }))
          .sort((a, b) => b.count - a.count),
        byStatusCode: Array.from(statusCodeStats.entries())
          .map(([statusCode, count]) => ({ statusCode, count }))
          .sort((a, b) => b.count - a.count),
        byTime: Array.from(timeStats.entries())
          .map(([date, stat]) => ({ date, count: stat.count, tokens: stat.tokens }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      };
    });
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
    return useEntityManager(async m => {
      const where: any = {};
      if (startDate && endDate) {
        where.createdAt = Between(new Date(startDate), new Date(endDate));
      }
      if (modelName) where.modelName = modelName;
      if (providerId) where.providerId = providerId;
      if (isSuccess !== undefined) where.isSuccess = isSuccess;

      const [logs, total] = await m.findAndCount(LlmChatLog, {
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const providers = await m.find(LlmProvider);
      const providerMap = new Map(providers.map(p => [p.id, p.name]));

      const items: LlmChatLogItem[] = logs.map(l => ({
        id: l.id,
        providerId: l.providerId,
        providerName: providerMap.get(l.providerId),
        modelName: l.modelName,
        durationMs: l.durationMs,
        isSuccess: l.isSuccess,
        statusCode: l.statusCode,
        error: l.error,
        promptTokens: l.promptTokens,
        completionTokens: l.completionTokens,
        totalTokens: l.totalTokens,
        createdAt: l.createdAt.toISOString(),
      }));

      return { items, total, page, pageSize };
    });
  }
}
