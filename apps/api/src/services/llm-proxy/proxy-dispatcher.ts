import { logger } from '@sker/core';
import { MAX_RETRIES, TIMEOUT_MS } from './types';
import { normalizeProxyRequest, buildUpstreamHeaders } from './request-normalizer';
import { handleNonStreamingResponse } from './non-streaming-handler';
import { handleCodexForcedStream } from './codex-stream-handler';
import { handleStreaming } from './streaming-handler';
import type { RateLimiter } from './rate-limiter';
import type { ProtocolConverter } from './protocol-converter';
import type { ChatLogRepository } from './chat-log';
import type { ProviderRepository } from './provider-repository';
import type { ProxyResult, Usage } from './types';

/**
 * 代理请求调度器：负责重试循环、provider 选择、请求转换、fetch 与状态处理
 */
export class ProxyDispatcher {
  constructor(
    private providerRepository: ProviderRepository,
    private rateLimiter: RateLimiter,
    private protocolConverter: ProtocolConverter,
    private chatLogRepository: ChatLogRepository,
  ) {}

  private calcPenalty(responseMs: number, contentLength: number): number {
    const len = Math.max(contentLength, 100)
    const raw = Math.ceil(responseMs / len * 0.1)
    return Math.min(10, Math.max(1, raw))
  }

  async proxyRequest(protocol: string, apiPath: string, body: Record<string, unknown> & { model?: string }, headers: Record<string, string>, contentLength: number): Promise<ProxyResult> {
    if (!body || typeof body !== 'object') {
      return { success: false, error: '请求体不能为空' }
    }

    if (!body.model) {
      return { success: false, error: '缺少必需参数: model' }
    }

    const triedProviders = new Set<string>()
    const requestedModel = body.model

    // 检测请求是否需要 thinking 模式
    const requiresThinking = !!(body.extended_thinking || body.thinking || body.enable_thinking)

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const provider = await this.providerRepository.findProvider(requestedModel, protocol, triedProviders, requiresThinking)
      if (!provider) {
        const thinkingHint = requiresThinking ? ' (需要 thinking 模式支持)' : ''
        return { success: false, error: `无可用 provider: ${requestedModel} (${protocol})${thinkingHint}` }
      }
      triedProviders.add(provider.providerId)

      // 确保 model 字段不为空，优先使用 provider.modelName，否则 fallback 到原始请求的 model
      const targetModel = provider.modelName || requestedModel
      if (!targetModel) {
        logger.error(`model 字段为空，跳过 provider`, { providerId: provider.providerId })
        continue
      }

      // 【请求前转换】从 protocol → provider.providerProtocol
      const needsConversion = protocol !== provider.providerProtocol
      let proxyBody: Record<string, unknown> = { ...body, model: targetModel }
      let proxyPath = apiPath

      if (needsConversion) {
        const convertedBody = this.protocolConverter.convertRequest(protocol, provider.providerProtocol || 'openai', { ...body, model: targetModel })

        if (provider.providerProtocol === 'openai') {
          proxyPath = '/chat/completions'
        } else if (provider.providerProtocol === 'anthropic') {
          proxyPath = '/v1/messages'  // BigModel 等 Anthropic 兼容接口使用 /v1/messages
        } else if (provider.providerProtocol === 'codex') {
          proxyPath = '/responses'
        }

        if (!convertedBody) {
          logger.error(`请求转换失败`, { from: protocol, to: provider.providerProtocol })
          continue
        }
        proxyBody = convertedBody
      }

      // 请求体标准化（tool 消息、$schema、thinking 参数、Codex 强制流式）
      const { originalStreamMode, forceStreamForCodex } = normalizeProxyRequest(proxyBody, requiresThinking, provider.providerProtocol)

      const reqHeaders = buildUpstreamHeaders(headers)
      const startTime = Date.now()

      try {
        const baseUrl = (provider.baseUrl || '').trim().replace(/\/+$/, '')
        let path = proxyPath.startsWith('/') ? proxyPath : `/${proxyPath}`

        // 检查 baseUrl 是否以 /v1 结尾，避免路径重复
        if (baseUrl.endsWith('/v1') && path.startsWith('/v1/')) {
          path = path.slice(3) // 去掉 /v1 前缀
        } else if (baseUrl === '/v1' && path.startsWith('/v1/')) {
          path = path.slice(3)
        }

        const url = `${baseUrl}${path}`
        const requestHeaders = {
          Authorization: `Bearer ${provider.apiKey}`,
          connection: `keep-alive`,
          'content-type': reqHeaders['content-type'] || 'application/json',
        }
        const requestBody = JSON.stringify(proxyBody)

        const response = await fetch(url, {
          method: 'POST',
          headers: requestHeaders,
          body: requestBody,
          signal: AbortSignal.timeout(TIMEOUT_MS)
        })
        const durationMs = Date.now() - startTime

        if (response.status === 403 || response.status === 401) {
          await this.providerRepository.setScoreToZero(provider.providerId)
          logger.warn(`权限错误，健康分清零`, { status: response.status, providerId: provider.providerId })
        } else if (response.status === 404) {
          await this.providerRepository.setScoreToZero(provider.providerId)
          logger.warn(`404 配置错误，健康分清零`, { providerId: provider.providerId })
        } else if (response.status === 429) {
          this.rateLimiter.setRateLimited(provider.providerId)
          // 打印 429 错误的详细信息
          const bodyStr = JSON.stringify(proxyBody)
          const bodyPreview = bodyStr.length > 100
            ? `${bodyStr.slice(0, 50)}...${bodyStr.slice(-50)}`
            : bodyStr
          logger.error(`429 限流错误`, { url: `${baseUrl}${path}`, auth: provider.apiKey ? `Bearer ${provider.apiKey.slice(0, 20)}...` : 'N/A', body: bodyPreview })
        } else if (response.status === 400) {
          await this.providerRepository.updateScore(provider.providerId, -500)
        } else if (response.status === 500) {
          await this.providerRepository.updateScore(provider.providerId, -1000)
        } else if (response.status >= 500) {
          await this.providerRepository.updateScore(provider.providerId, -800)
        } else if (response.status >= 400) {
          await this.providerRepository.updateScore(provider.providerId, -300)
        } else if (response.ok) {
          const penalty = this.calcPenalty(durationMs, contentLength)
          await this.providerRepository.updateScore(provider.providerId, -penalty)
        }
        if (!response.body) {
          return { success: true, response }
        }

        // 使用实际发送的请求体判断是否流式（考虑 Codex 强制流式的情况）
        const isStreaming = proxyBody.stream === true
        let usage: Usage | undefined

        if (!isStreaming) {
          return await handleNonStreamingResponse(
            { provider, requestedModel, proxyBody, needsConversion, protocol, url, protocolConverter: this.protocolConverter, chatLogRepository: this.chatLogRepository, providerRepository: this.providerRepository },
            response,
            durationMs
          )
        }

        const logId = await this.chatLogRepository.saveLog({
          providerId: provider.providerId,
          modelName: requestedModel,
          request: proxyBody,
          durationMs,
          isSuccess: response.ok,
          statusCode: response.status
        })

        // Codex 强制流式模式：收集完整响应后转为非流式
        if (forceStreamForCodex) {
          return await handleCodexForcedStream(
            { provider, requestedModel, proxyBody, originalStreamMode, needsConversion, protocol, durationMs, chatLogRepository: this.chatLogRepository, protocolConverter: this.protocolConverter },
            response,
            usage,
            logId
          )
        }

        // 【流式响应转换】使用 Visitor 转换
        return handleStreaming(
          { provider, protocol, needsConversion, requiresThinking, responseStatus: response.status, protocolConverter: this.protocolConverter, chatLogRepository: this.chatLogRepository, providerRepository: this.providerRepository },
          response,
          usage,
          logId
        )
      } catch (error) {
        const durationMs = Date.now() - startTime
        const isTimeout = error instanceof Error && error.name === 'TimeoutError'

        const url = `${provider.baseUrl}${proxyPath}`
        const bodyStr = JSON.stringify(proxyBody)
        const bodyPreview = bodyStr.length > 100
          ? `${bodyStr.slice(0, 50)}...${bodyStr.slice(-50)}`
          : bodyStr

        logger.error(`请求失败（重试 ${attempt + 1}/${MAX_RETRIES}）`, {
          url,
          auth: provider.apiKey ? `Bearer ${provider.apiKey.slice(0, 20)}...` : 'N/A',
          body: bodyPreview,
          error: error instanceof Error ? error.message : String(error),
          isTimeout
        })

        await this.providerRepository.updateScore(provider.providerId, isTimeout ? -100 : -1000)

        await this.chatLogRepository.saveLog({
          providerId: provider.providerId,
          modelName: requestedModel,
          request: proxyBody,
          durationMs,
          isSuccess: false,
          statusCode: 0,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return { success: false, error: '所有 provider 均失败' }
  }
}
