import { Injectable } from '@sker/core';
import { LlmChatLog, LlmProvider, useEntityManager } from '@sker/entities';
import type { LlmChatLogStats, LlmChatLogListResult, LlmChatLogItem } from '@sker/sdk';
import { Between, Like } from 'typeorm';

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
      // 如果未指定粒度，根据时间范围自动确定
      let granularityType = granularity;
      if (!granularityType && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (diffHours <= 1) {
          granularityType = 'minute';
        } else if (diffHours <= 24) {
          granularityType = 'hour';
        } else {
          granularityType = 'day';
        }
      }

      let timeQuery = m.createQueryBuilder(LlmChatLog, 'log')
        .addSelect('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(log.totalTokens), 0)', 'tokens')
        .where(where);

      if (granularityType === 'minute') {
        timeQuery = timeQuery
          .select("DATE_FORMAT(log.createdAt, '%Y-%m-%d %H:%i:00')", 'date')
          .groupBy("DATE_FORMAT(log.createdAt, '%Y-%m-%d %H:%i:00')");
      } else if (granularityType === 'hour') {
        timeQuery = timeQuery
          .select("DATE_FORMAT(log.createdAt, '%Y-%m-%d %H:00:00')", 'date')
          .groupBy("DATE_FORMAT(log.createdAt, '%Y-%m-%d %H:00:00')");
      } else {
        // 默认按天
        timeQuery = timeQuery
          .select('DATE(log.createdAt)', 'date')
          .groupBy('DATE(log.createdAt)');
      }

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
          successRate: stat.count > 0 ? Math.round((parseInt(stat.success) || 0) / parseInt(stat.count) * 100) : null,
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
        byTime: (timeStats || []).map((stat: any) => {
          // 格式化日期字符串
          let dateStr = stat.date;
          if (granularityType === 'minute') {
            // 格式：2024-01-15 14:30:00
            dateStr = dateStr + ':00';
          } else if (granularityType === 'hour') {
            // 格式：2024-01-15 14:00:00
            dateStr = dateStr + ':00';
          }
          return {
            date: dateStr,
            count: parseInt(stat.count) || 0,
            tokens: parseInt(stat.tokens) || 0,
          };
        }),
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
}
