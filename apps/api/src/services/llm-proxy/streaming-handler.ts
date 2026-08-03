import { logger } from '@sker/core';
import { createSSELineStream, createSSEDataStream, createJSONParseStream } from './sse-stream';
import { isThinkingError } from './thinking-error';
import type { ProtocolConverter } from './protocol-converter';
import type { ChatLogRepository } from './chat-log';
import type { ProviderRepository } from './provider-repository';
import type { ProviderInfo, ProxyResult, Usage } from './types';

export interface StreamingContext {
  provider: ProviderInfo
  protocol: string
  needsConversion: boolean
  requiresThinking: boolean
  responseStatus: number
  protocolConverter: ProtocolConverter
  chatLogRepository: ChatLogRepository
  providerRepository: ProviderRepository
}

/**
 * 处理流式响应：SSE 解析 → 协议转换 → 转发给客户端，并在 flush 时更新日志
 */
export function handleStreaming(
  ctx: StreamingContext,
  response: Response,
  usage: Usage | undefined,
  logId: string | undefined
): ProxyResult {
  const encoder = new TextEncoder()
  let thinkingErrorDetected = false
  const conversionCtx: Record<string, unknown> = {} // 上下文对象，用于维护流式状态

  // 流式处理管道：行解析 -> 数据提取 -> JSON 解析 -> 协议转换 -> 监控
  const monitoredBody = response.body!
    .pipeThrough(createSSELineStream())
    .pipeThrough(createSSEDataStream())
    .pipeThrough(createJSONParseStream())
    .pipeThrough(new TransformStream({
      transform: (data: unknown, controller) => {
        // 打印流数据概览（前10 + ... + 后10字符）
        if (data && typeof data === 'object') {
          const dataStr = JSON.stringify(data)
          const _preview = dataStr.length > 20
            ? `${dataStr.slice(0, 50)}...${dataStr.slice(-50)}`
            : dataStr
        }

        // [DONE] 标记直接透传
        if (data === '[DONE]') {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          return
        }

        const d = data as Record<string, unknown>

        // 检测流式响应中的 thinking 错误
        if (!thinkingErrorDetected && ctx.responseStatus === 400 && ctx.requiresThinking && d.error) {
          const errorObj = d.error as { message?: string } | string
          const errorMessage = typeof errorObj === 'string' ? errorObj : (errorObj.message || JSON.stringify(errorObj))
          const isThinkingErrorResult = isThinkingError(errorMessage)

          if (isThinkingErrorResult) {
            thinkingErrorDetected = true
            ctx.providerRepository.disableThinkingSupport(ctx.provider.providerId, ctx.provider.modelName).catch((err: unknown) => logger.error('禁用 thinking 支持失败', { error: err }))
            logger.error(`检测到 thinking 模式不支持错误（流式），已自动禁用`, { modelName: ctx.provider.modelName })
          }
        }

        // 提取 usage 信息
        if (d.usage) {
          const usageObj = d.usage as Usage
          if (!usage) usage = {}
          if (usageObj.input_tokens) usage.input_tokens = usageObj.input_tokens
          if (usageObj.output_tokens) usage.output_tokens = usageObj.output_tokens
        }

        // 协议转换（使用 Visitor）
        const converted = ctx.protocolConverter.convertStreamEvent(ctx.needsConversion, ctx.provider.providerProtocol || 'openai', ctx.protocol, data, conversionCtx)

        // 输出转换后的事件
        if (converted !== null && converted !== undefined) {
          if (Array.isArray(converted)) {
            // anthropic 返回的是事件数组
            for (const event of converted) {
              controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`))
            }
          } else {
            // openai/codex 返回单个事件
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(converted)}\n\n`))
          }
        }
      },
      flush: async () => {
        if (logId && usage) {
          const totalTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0)
          if (totalTokens > 0) {
            await ctx.chatLogRepository.updateLog(logId, usage)
          }
        }
      }
    }))

  return {
    success: true,
    response: new Response(monitoredBody, {
      status: ctx.responseStatus,
      headers: response.headers
    })
  }
}
