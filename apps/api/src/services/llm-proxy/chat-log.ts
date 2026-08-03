import { logger } from '@sker/core';
import { useEntityManager, LlmChatLog } from '@sker/entities';
import type { ChatLogParams, Usage } from './types';

/**
 * LLM 调用日志仓储：记录与更新调用日志
 */
export class ChatLogRepository {
  async saveLog(params: ChatLogParams): Promise<string | undefined> {
    try {
      return await useEntityManager(async m => {
        const log = await m.save(LlmChatLog, {
          providerId: params.providerId,
          modelName: params.modelName,
          request: params.request,
          durationMs: params.durationMs,
          isSuccess: params.isSuccess,
          statusCode: params.statusCode,
          promptTokens: params.usage?.input_tokens,
          completionTokens: params.usage?.output_tokens,
          totalTokens: params.usage ? (params.usage.input_tokens || 0) + (params.usage.output_tokens || 0) : undefined,
          error: params.error
        })
        return log.id
      })
    } catch (err) {
      logger.error('日志记录失败', { error: err })
      return undefined
    }
  }

  async updateLog(logId: string, usage: Usage): Promise<void> {
    try {
      await useEntityManager(async m => {
        await m.update(LlmChatLog, logId, {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
        })
      })
    } catch (err) {
      logger.error('更新 token 失败', { error: err })
    }
  }
}
