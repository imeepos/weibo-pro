import { Injectable } from '@sker/core';
import { LlmChatLog, LlmProvider, useEntityManager } from '@sker/entities';
import type { LlmChatLogStats, LlmChatLogListResult, LlmChatLogItem, PromptAnalysisResult } from '@sker/sdk';
import { Between, Like } from 'typeorm';
import { createHash } from 'crypto';

@Injectable({ providedIn: 'root' })
export class LlmChatLogService {
  async getStats(startDate?: string, endDate?: string, granularity?: 'minute' | 'hour' | 'day'): Promise<LlmChatLogStats> {
    return useEntityManager(async m => {
      console.log('[LlmChatLogService] Getting stats with date range:', { startDate, endDate });
      const where: any = {};
      if (startDate && endDate) {
        where.createdAt = Between(new Date(startDate), new Date(endDate));
      }

      // 获取提供商映射
      const providers = await m.find(LlmProvider);
      const providerMap = new Map(providers.map(p => [p.id, p.name]));

      // 使用数据库聚合查询替代内存计算
      const [
        totalRequests,
        successCount,
        tokenStats,
        avgDuration,
        modelStats,
        providerStats,
        statusCodeStats
      ] = await Promise.all([
        // 总请求数
        m.count(LlmChatLog, { where }),

        // 成功数
        m.count(LlmChatLog, { where: { ...where, isSuccess: true } }),

        // Token 统计
        m.createQueryBuilder(LlmChatLog, 'log')
          .select('COALESCE(SUM(log.promptTokens), 0)', 'promptSum')
          .addSelect('COALESCE(SUM(log.completionTokens), 0)', 'completionSum')
          .addSelect('COALESCE(SUM(log.totalTokens), 0)', 'totalSum')
          .where(where)
          .getRawOne(),

        // 平均耗时 - 只计算有效的耗时（大于0的值）
        m.createQueryBuilder(LlmChatLog, 'log')
          .select('COALESCE(AVG(CASE WHEN log.durationMs > 0 THEN log.durationMs ELSE NULL END), 0)', 'avg')
          .where(where)
          .getRawOne(),

        // 按模型统计
        m.createQueryBuilder(LlmChatLog, 'log')
          .select("COALESCE(log.modelName, 'Unknown')", 'modelName')
          .addSelect('COUNT(*)', 'count')
          .addSelect('COALESCE(SUM(CASE WHEN log.isSuccess = true THEN 1 ELSE 0 END), 0)', 'success')
          .addSelect('COALESCE(SUM(CASE WHEN log.totalTokens IS NOT NULL THEN log.totalTokens ELSE 0 END), 0)', 'tokens')
          .where(where)
          .groupBy('log.modelName')
          .orderBy('count', 'DESC')
          .getRawMany(),

        // 按提供商统计
        m.createQueryBuilder(LlmChatLog, 'log')
          .select('log.providerId', 'providerId')
          .addSelect('COUNT(*)', 'count')
          .addSelect('COALESCE(SUM(CASE WHEN log.isSuccess = true THEN 1 ELSE 0 END), 0)', 'success')
          .addSelect('COALESCE(SUM(CASE WHEN log.totalTokens IS NOT NULL THEN log.totalTokens ELSE 0 END), 0)', 'tokens')
          .where(where)
          .groupBy('log.providerId')
          .orderBy('count', 'DESC')
          .getRawMany(),

        // 按状态码统计
        m.createQueryBuilder(LlmChatLog, 'log')
          .select('log.statusCode', 'statusCode')
          .addSelect('COUNT(*)', 'count')
          .where(where)
          .andWhere('log.statusCode IS NOT NULL')
          .groupBy('log.statusCode')
          .orderBy('count', 'DESC')
          .getRawMany(),
      ]);

      // 按时间统计（根据粒度自动选择）
      let granularityType = granularity;
      if (!granularityType && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        granularityType = diffHours <= 1 ? 'minute' : diffHours <= 24 ? 'hour' : 'day';
        console.log('[LlmChatLogService] Auto granularity:', { diffHours, granularityType });
      }

      const dateExpr = granularityType === 'minute'
        ? "TO_CHAR(log.createdAt AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI:00')"
        : granularityType === 'hour'
          ? "TO_CHAR(log.createdAt AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:00:00')"
          : "TO_CHAR(log.createdAt AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD')";

      const timeQuery = m.createQueryBuilder(LlmChatLog, 'log')
        .select(dateExpr, 'date')
        .addSelect('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(log.totalTokens), 0)', 'tokens')
        .where(where)
        .groupBy(dateExpr);

      const timeStats = await timeQuery.orderBy('date', 'ASC').getRawMany();

      const failCount = totalRequests - successCount;

      // 添加调试日志
      console.log('[LlmChatLogService] Raw stats data:', {
        totalRequests,
        successCount,
        tokenStats,
        avgDuration,
        modelStats: modelStats?.slice(0, 3), // 只显示前3个
        providerStats: providerStats?.slice(0, 3),
        statusCodeStats: statusCodeStats?.slice(0, 5),
        timeStats: timeStats?.slice(0, 5)
      });

      return {
        totalRequests,
        successCount,
        failCount,
        // 使用独立的 token 统计查询结果
        totalPromptTokens: parseInt(tokenStats?.promptSum) || 0,
        totalCompletionTokens: parseInt(tokenStats?.completionSum) || 0,
        totalTokens: parseInt(tokenStats?.totalSum) || 0,
        avgDurationMs: Math.round(parseFloat(avgDuration?.avg || '0') || 0),
        byModel: (modelStats || []).map((stat: any) => ({
          modelName: stat.modelName,
          count: parseInt(stat.count) || 0,
          successRate: stat.count > 0 ? Math.round((parseInt(stat.success) || 0) / parseInt(stat.count) * 100) : 0,
          tokens: parseInt(stat.tokens) || 0,
        })),
        byProvider: (providerStats || []).map((stat: any) => ({
          providerId: stat.providerId,
          providerName: providerMap.get(stat.providerId) || stat.providerId,
          count: parseInt(stat.count) || 0,
          successRate: stat.count > 0 ? Math.round((parseInt(stat.success) || 0) / parseInt(stat.count) * 100) : 0,
          tokens: parseInt(stat.tokens) || 0,
        })),
        byStatusCode: (statusCodeStats || []).map((stat: any) => ({
          statusCode: parseInt(stat.statusCode) || 0,
          count: parseInt(stat.count) || 0,
        })),
        byTime: (timeStats || []).map((stat: any) => ({
          date: stat.date,
          count: parseInt(stat.count) || 0,
          tokens: parseInt(stat.tokens) || 0,
        })),
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

      // 优化：只查询需要的字段，避免查询大的 request JSON 字段
      const [logs, total] = await m.findAndCount(LlmChatLog, {
        select: [
          'id', 'providerId', 'modelName', 'durationMs',
          'isSuccess', 'statusCode', 'error',
          'promptTokens', 'completionTokens', 'totalTokens',
          'createdAt'
        ],
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

  async analyzePrompts(
    startDate?: string,
    endDate?: string,
    modelName?: string,
    providerId?: string
  ): Promise<PromptAnalysisResult> {
    return useEntityManager(async m => {
      const where: any = {};
      if (startDate && endDate) {
        where.createdAt = Between(new Date(startDate), new Date(endDate));
      }
      if (modelName) where.modelName = modelName;
      if (providerId) where.providerId = providerId;

      const PAGE_SIZE = 5000;
      let offset = 0;
      let hasMore = true;
      const promptMap = new Map<string, { content: string; count: number; type: 'system' | 'user' | 'assistant' | 'tool' }>();

      while (hasMore) {
        const logs = await m.find(LlmChatLog, {
          select: ['request'],
          where,
          order: { createdAt: 'ASC' },
          skip: offset,
          take: PAGE_SIZE,
        });

        if (logs.length === 0) {
          hasMore = false;
          break;
        }

        for (const log of logs) {
          try {
            const request = typeof log.request === 'string' ? JSON.parse(log.request) : log.request;

            // 调试：记录第一个请求的结构
            if (offset === 0 && logs.indexOf(log) === 0) {
              const hasSystem = !!request.system;
              const hasMessages = !!(request.messages && Array.isArray(request.messages));
              const hasTools = !!(request.tools && Array.isArray(request.tools));

              console.log('[LlmChatLogService] Sample request structure:', {
                hasSystem,
                hasMessages,
                hasTools,
                systemType: request.system ? (Array.isArray(request.system) ? 'array' : typeof request.system) : 'none',
                messagesCount: request.messages?.length || 0,
                toolsCount: request.tools?.length || 0,
                messageRoles: request.messages?.map((m: any) => m.role).filter(Boolean),
              });
            }

            // 1. 提取 system 参数（Anthropic API）
            if (request.system) {
              const systemContents = this.extractSystemContent(request.system);
              if (offset === 0 && logs.indexOf(log) === 0) {
                console.log(`[LlmChatLogService] Extracted ${systemContents.length} system contents from first request`);
              }
              for (const content of systemContents) {
                if (!content || content.length === 0) continue;
                const hash = this.hashContent(content);
                const existing = promptMap.get(hash);
                if (existing) {
                  existing.count++;
                } else {
                  promptMap.set(hash, { content, count: 1, type: 'system' });
                }
              }
            }

            // 2. 提取 messages 中的提示词
            if (request.messages && Array.isArray(request.messages)) {
              for (const message of request.messages) {
                if (!message || typeof message !== 'object') continue;

                const content = this.extractMessageContent(message);
                if (!content || content.length === 0) continue;

                // 角色识别：只使用 role 字段
                const role = message.role;
                let type: 'system' | 'user' | 'assistant' | 'tool' = 'user';

                if (role === 'system') {
                  type = 'system';
                } else if (role === 'assistant') {
                  type = 'assistant';
                } else if (role === 'tool') {
                  type = 'tool';
                } else if (role === 'user') {
                  type = 'user';
                } else {
                  // 如果 role 不是标准值，默认为 user
                  console.warn(`[LlmChatLogService] Unknown role: ${role}, defaulting to user`);
                  type = 'user';
                }

                const hash = this.hashContent(content);
                const existing = promptMap.get(hash);
                if (existing) {
                  existing.count++;
                } else {
                  promptMap.set(hash, { content, count: 1, type });
                }
              }
            }

            // 3. 提取 tools 中的主要描述（简化版）
            if (request.tools && Array.isArray(request.tools)) {
              for (const tool of request.tools) {
                if (!tool || typeof tool !== 'object') continue;

                // 只提取 function.description（主要描述）
                if (tool.function?.description && typeof tool.function.description === 'string') {
                  const content = tool.function.description.trim();
                  if (content.length > 0) {
                    const hash = this.hashContent(content);
                    const existing = promptMap.get(hash);
                    if (existing) {
                      existing.count++;
                    } else {
                      promptMap.set(hash, { content, count: 1, type: 'tool' });
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.warn('[LlmChatLogService] Failed to parse request:', error);
          }
        }

        offset += PAGE_SIZE;
        console.log(`[LlmChatLogService] Analyzed ${offset} logs, found ${promptMap.size} unique prompts`);
      }

      // 转换为数组并按使用次数降序排序
      const items: any[] = Array.from(promptMap.entries()).map(([hash, data]) => ({
        content: data.content,
        hash,
        count: data.count,
        type: data.type,
      }));

      items.sort((a, b) => b.count - a.count);

      // 计算总使用次数
      const totalUsage = items.reduce((sum, item) => sum + item.count, 0);

      // 按类型统计
      const typeStats = new Map<string, { count: number; usage: number }>();
      for (const item of items) {
        const stat = typeStats.get(item.type);
        if (stat) {
          stat.count++;
          stat.usage += item.count;
        } else {
          typeStats.set(item.type, { count: 1, usage: item.count });
        }
      }

      const byType = Array.from(typeStats.entries()).map(([type, stat]) => ({
        type,
        count: stat.count,
        usage: stat.usage,
      }));

      console.log('[LlmChatLogService] Analysis complete:', {
        total: items.length,
        totalUsage,
        byType,
      });

      return {
        items,
        total: items.length,
        totalUsage,
        byType,
      };
    });
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex').substring(0, 16);
  }

  private extractMessageContent(message: any): string | null {
    if (!message.content) return null;

    if (typeof message.content === 'string') {
      return message.content.trim();
    }

    if (Array.isArray(message.content)) {
      const textParts = message.content
        .filter((item: any) => item?.type === 'text' && typeof item.text === 'string')
        .map((item: any) => item.text.trim());
      return textParts.length > 0 ? textParts.join('\n') : null;
    }

    return null;
  }

  private extractSystemContent(system: any): string[] {
    const contents: string[] = [];

    if (typeof system === 'string') {
      const content = system.trim();
      if (content.length > 0) {
        contents.push(content);
      }
    } else if (Array.isArray(system)) {
      for (const item of system) {
        // 支持多种格式
        if (typeof item === 'string') {
          // 直接是字符串
          const content = item.trim();
          if (content.length > 0) {
            contents.push(content);
          }
        } else if (item && typeof item === 'object') {
          // 对象格式：{ type: 'text', text: '...' } 或 { text: '...' }
          const text = item.text || item.content;
          if (typeof text === 'string') {
            const content = text.trim();
            if (content.length > 0) {
              contents.push(content);
            }
          }
        }
      }
    } else if (system && typeof system === 'object') {
      // 对象格式（非数组）
      const text = system.text || system.content;
      if (typeof text === 'string') {
        const content = text.trim();
        if (content.length > 0) {
          contents.push(content);
        }
      }
    }

    return contents;
  }
}
