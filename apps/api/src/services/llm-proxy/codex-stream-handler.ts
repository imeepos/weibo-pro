import { logger } from '@sker/core';
import { buildCodexResponseFromStream } from './codex-stream-builder';
import { createSSELineStream, createSSEDataStream, createJSONParseStream } from './sse-stream';
import { extractTextContent } from './text-extract';
import type { ChatLogRepository } from './chat-log';
import type { ProtocolConverter } from './protocol-converter';
import type { ProviderInfo, ProxyResult, Usage } from './types';

export interface CodexStreamContext {
  provider: ProviderInfo
  requestedModel: string
  proxyBody: Record<string, unknown>
  originalStreamMode: unknown
  needsConversion: boolean
  protocol: string
  durationMs: number
  chatLogRepository: ChatLogRepository
  protocolConverter: ProtocolConverter
}

/**
 * 处理 Codex 强制流式模式：收集完整响应后转为非流式
 */
export async function handleCodexForcedStream(
  ctx: CodexStreamContext,
  response: Response,
  usage: Usage | undefined,
  logId: string | undefined
): Promise<ProxyResult> {
  // 如果响应失败（HTTP 4xx/5xx），直接收集错误并返回
  if (!response.ok) {
    logger.error('Codex 流式请求返回错误状态', { status: response.status })

    const chunks: unknown[] = []
    const reader = response.body
      ?.pipeThrough(createSSELineStream())
      .pipeThrough(createSSEDataStream())
      .pipeThrough(createJSONParseStream())
      .getReader()

    try {
      while (true) {
        const { done, value } = await reader!.read()
        if (done) break
        if (value && value !== '[DONE]') {
          chunks.push(value)
        }
      }

      // 查找错误事件
      const errorEvent = chunks.find((chunk: unknown) => (chunk as { type?: string; error?: unknown }).type === 'error' || (chunk as { error?: unknown }).error)
      const errorMessage = (errorEvent as { message?: string; error?: { message?: string } })?.message || (errorEvent as { error?: { message?: string } })?.error?.message || 'Unknown error'

      logger.error('Codex 错误', { message: errorMessage })

      // 返回错误响应，让外层重试逻辑处理
      throw new Error(errorMessage)
    } catch (streamError) {
      logger.error('Codex 错误流收集失败', { error: streamError })
      throw streamError
    }
  }

  const chunks: unknown[] = []
  const reader = response.body
    ?.pipeThrough(createSSELineStream())
    .pipeThrough(createSSEDataStream())
    .pipeThrough(createJSONParseStream())
    .getReader()

  try {
    while (true) {
      const { done, value } = await reader!.read()
      if (done) break
      if (value && value !== '[DONE]') {
        chunks.push(value)
        const v = value as { usage?: Usage }
        if (v.usage) {
          if (!usage) usage = {}
          if (v.usage.input_tokens) usage.input_tokens = v.usage.input_tokens
          if (v.usage.output_tokens) usage.output_tokens = v.usage.output_tokens
        }
      }
    }

    // 将流式事件重建为完整响应
    const fullResponse = buildCodexResponseFromStream(chunks)

    // 如果需要协议转换，则转换
    let finalResponse: Record<string, unknown> = fullResponse
    if (ctx.needsConversion) {
      const converted = ctx.protocolConverter.convertResponse(ctx.provider.providerProtocol || 'openai', ctx.protocol, fullResponse)
      if (converted) {
        finalResponse = converted
      }
    }

    // 打印最终响应预览
    const finalResponseStr = JSON.stringify(finalResponse)
    const _finalPreview = finalResponseStr.length > 100
      ? `${finalResponseStr.slice(0, 50)}...${finalResponseStr.slice(-50)}`
      : finalResponseStr

    // 提取并打印文本内容
    const textContent = extractTextContent(finalResponse)
    if (textContent) {
      const textPreview = textContent.length > 100
        ? `${textContent.slice(0, 100)}...${textContent.slice(-100)}`
        : textContent
      logger.info(`返回文本`, { preview: textPreview })
    }

    await ctx.chatLogRepository.saveLog({
      providerId: ctx.provider.providerId,
      modelName: ctx.requestedModel,
      request: { ...ctx.proxyBody, stream: ctx.originalStreamMode }, // 记录原始 stream 模式
      durationMs: ctx.durationMs,
      isSuccess: true,
      statusCode: 200,
      usage
    })

    return {
      success: true,
      response: new Response(JSON.stringify(finalResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  } catch (streamError) {
    logger.error('Codex 流式响应收集失败', { error: streamError })
    throw streamError
  }
}
