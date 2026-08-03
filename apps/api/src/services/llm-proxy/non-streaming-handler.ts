import { logger } from '@sker/core';
import { isThinkingError } from './thinking-error';
import { extractTextContent } from './text-extract';
import type { ProtocolConverter } from './protocol-converter';
import type { ChatLogRepository } from './chat-log';
import type { ProviderRepository } from './provider-repository';
import type { ProviderInfo, ProxyResult, Usage } from './types';

export interface NonStreamingContext {
  provider: ProviderInfo
  requestedModel: string
  proxyBody: Record<string, unknown>
  needsConversion: boolean
  protocol: string
  url: string
  protocolConverter: ProtocolConverter
  chatLogRepository: ChatLogRepository
  providerRepository: ProviderRepository
}

/**
 * 处理非流式响应：记录日志、协议转换、返回标准 JSON Response
 */
export async function handleNonStreamingResponse(
  ctx: NonStreamingContext,
  response: Response,
  durationMs: number
): Promise<ProxyResult> {
  const responseData = await response.json()
  const usage: Usage | undefined = responseData.usage

  if (response.ok) {
    if (ctx.protocol === 'openai' && !responseData.choices && responseData.object !== 'error') {
      if (responseData.object === 'response' && !responseData.output) {
        return {
          success: false,
          response: new Response(JSON.stringify({
            error: {
              message: 'Provider returned incomplete response (missing output field)',
              type: 'api_error',
              code: 'incomplete_response'
            }
          }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }
    }
  }

  // 记录响应体（仅在非成功状态下）
  if (!response.ok) {
    logger.error(`响应体`, {
      statusCode: response.status,
      responseData: JSON.stringify(responseData, null, 2) // 完整输出，便于调试
    })
  }

  // 检测 400 错误中的 thinking 模式不支持错误
  if (response.status === 400) {
    const errorMessage = responseData?.error?.message || JSON.stringify(responseData)
    const isThinkingErrorResult = isThinkingError(errorMessage)

    if (isThinkingErrorResult) {
      await ctx.providerRepository.disableThinkingSupport(ctx.provider.providerId, ctx.provider.modelName)
      logger.error(`检测到 thinking 模式不支持错误，已自动禁用`, { modelName: ctx.provider.modelName })
    }
  }

  await ctx.chatLogRepository.saveLog({
    providerId: ctx.provider.providerId,
    modelName: ctx.requestedModel,
    request: ctx.proxyBody,
    durationMs,
    isSuccess: response.ok,
    statusCode: response.status,
    usage,
    error: response.ok ? undefined : JSON.stringify(responseData)
  })

  let finalResponse = responseData
  if (ctx.needsConversion && response.ok) {
    try {
      finalResponse = ctx.protocolConverter.convertResponse(ctx.provider.providerProtocol || 'openai', ctx.protocol, responseData)

      if (!finalResponse) {
        logger.error(`响应转换返回 null`, { from: ctx.provider.providerProtocol, to: ctx.protocol })
        finalResponse = responseData
      }
    } catch (conversionError) {
      logger.error(`响应转换异常`, { error: conversionError, url: ctx.url, model: ctx.proxyBody.model, protocol: `${ctx.provider.providerProtocol} → ${ctx.protocol}` })

      // 检查是否是 BigModel 的非标准错误响应
      if ((responseData as { code?: unknown; success?: boolean }).code && (responseData as { code?: unknown; success?: boolean }).success === false) {
        logger.warn(`检测到非标准错误格式`, { url: ctx.url, model: ctx.proxyBody.model })
        // 转换为标准的 OpenAI 错误格式
        return {
          success: false,
          response: new Response(JSON.stringify({
            error: {
              message: (responseData as any).msg || 'Unknown error',
              type: 'api_error',
              code: (responseData as any).code
            }
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }

      finalResponse = responseData
    }
  }
  // 提取并打印文本内容
  const _textContent = extractTextContent(finalResponse)
  void _textContent
  const responseBody = JSON.stringify(finalResponse)
  return {
    success: true,
    response: new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
