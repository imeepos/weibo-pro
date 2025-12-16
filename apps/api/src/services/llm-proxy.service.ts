import { Injectable } from '@sker/core';
import { useEntityManager, LlmModelProvider, LlmProvider, LlmChatLog } from '@sker/entities';
import { Brackets } from 'typeorm';
import {
  openaiRequestToClaude,
  claudeResponseToOpenai,
  createClaudeToOpenaiStreamConverter,
  claudeRequestToOpenai,
  openaiResponseToClaude,
  createOpenaiToClaudeStreamConverter,
  type ClaudeResponse,
  type OpenAIResponse,
  type ClaudeStreamEvent,
  type OpenAIStreamResponse,
} from '@sker/openai2anthropic';

interface ProviderInfo {
  providerId: string
  baseUrl: string
  apiKey: string
  modelName: string
  providerProtocol: string
}

interface ProxyResult {
  success: boolean
  response?: Response
  error?: string
}

const TIMEOUT_MS = 1000 * 3 * 60;
const IDLE_TIMEOUT_MS = 1000 * 60;
const MAX_RETRIES = 3

@Injectable({ providedIn: 'root' })
export class LlmProxyService {

  async findProvider(requestedModel: string, protocol: string, excludeIds: Set<string> = new Set(), requiresThinking: boolean = false): Promise<ProviderInfo | null> {
    if (!requestedModel) return null

    return useEntityManager(async m => {
      // 模型名匹配条件：供应商模型名 或 标准模型名
      const modelMatchCondition = new Brackets(qb => {
        qb.where('mp.modelName = :requestedModel', { requestedModel })
          .orWhere('model.name = :requestedModel', { requestedModel })
      })

      // 构建基础查询条件
      const buildBaseConditions = (qb: any) => {
        qb.andWhere('provider.score > 0')
        if (requiresThinking) {
          qb.andWhere('mp.supportsThinking = :supportsThinking', { supportsThinking: true })
        }
        if (excludeIds.size > 0) {
          qb.andWhere('provider.id NOT IN (:...excludeIds)', { excludeIds: [...excludeIds] })
        }
      }

      // 1. 获取所有可用梯队
      const tierQuery = m.createQueryBuilder(LlmModelProvider, 'mp')
        .innerJoin('mp.provider', 'provider')
        .leftJoin('mp.model', 'model')
        .select('DISTINCT mp.tierLevel', 'tier')
        .where(modelMatchCondition)
      buildBaseConditions(tierQuery)

      const availableTiers = await tierQuery.orderBy('tier', 'ASC').getRawMany()

      // 2. 逐层查找最优 provider（优先相同协议，其次跨协议）
      for (const { tier } of availableTiers) {
        const providerQuery = m.createQueryBuilder(LlmModelProvider, 'mp')
          .innerJoin('mp.provider', 'provider')
          .leftJoin('mp.model', 'model')
          .select('provider.id', 'provider_id')
          .addSelect('provider.base_url', 'provider_base_url')
          .addSelect('provider.api_key', 'provider_api_key')
          .addSelect('provider.protocol', 'provider_protocol')
          .addSelect('mp.model_name', 'mp_model_name')
          .where(modelMatchCondition)
          .andWhere('mp.tierLevel = :tier', { tier })
        buildBaseConditions(providerQuery)

        // 优先相同协议（protocol_priority=0），其次跨协议（protocol_priority=1）
        const result = await providerQuery
          .addSelect(`CASE WHEN provider.protocol = :protocol THEN 0 ELSE 1 END`, 'protocol_priority')
          .setParameter('protocol', protocol)
          .orderBy('protocol_priority', 'ASC')
          .addOrderBy('provider.score', 'DESC')
          .getRawOne()

        if (result?.provider_id) {
          const modelName = result.mp_model_name
          if (!modelName) {
            console.warn(`[findProvider] provider ${result.provider_id} 的 modelName 为空，跳过`)
            continue
          }

          return {
            providerId: result.provider_id,
            baseUrl: result.provider_base_url,
            apiKey: result.provider_api_key,
            modelName,
            providerProtocol: result.provider_protocol
          }
        }
      }

      return null
    })
  }

  async updateScore(providerId: string, delta: number): Promise<void> {
    await useEntityManager(async m => {
      await m.createQueryBuilder()
        .update(LlmProvider)
        .set({ score: () => `GREATEST(0, score + ${delta})` })
        .where('id = :providerId', { providerId })
        .execute()
    })
  }

  async setScoreToZero(providerId: string): Promise<void> {
    await useEntityManager(async m => {
      await m.createQueryBuilder()
        .update(LlmProvider)
        .set({ score: 0 })
        .where('id = :providerId', { providerId })
        .execute()
    })
  }

  async disableThinkingSupport(providerId: string, modelName: string): Promise<void> {
    await useEntityManager(async m => {
      await m.createQueryBuilder()
        .update(LlmModelProvider)
        .set({ supportsThinking: false })
        .where('providerId = :providerId', { providerId })
        .andWhere('modelName = :modelName', { modelName })
        .execute()
    })
    console.warn(`已自动禁用 thinking 支持: provider=${providerId}, model=${modelName}`)
  }

  private calcPenalty(responseMs: number, contentLength: number): number {
    const len = Math.max(contentLength, 100)
    const raw = Math.ceil(responseMs / len * 0.1)
    return Math.min(10, Math.max(1, raw))
  }

  async proxyRequest(protocol: string, apiPath: string, body: any, headers: Record<string, string>, contentLength: number): Promise<ProxyResult> {
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
      const provider = await this.findProvider(requestedModel, protocol, triedProviders, requiresThinking)
      if (!provider) {
        const thinkingHint = requiresThinking ? ' (需要 thinking 模式支持)' : ''
        return { success: false, error: `无可用 provider: ${requestedModel} (${protocol})${thinkingHint}` }
      }
      triedProviders.add(provider.providerId)

      // 确保 model 字段不为空，优先使用 provider.modelName，否则 fallback 到原始请求的 model
      const targetModel = provider.modelName || requestedModel
      if (!targetModel) {
        console.error(`[proxyRequest] model 字段为空，跳过 provider ${provider.providerId}`)
        continue
      }

      // 协议转换：请求协议 vs Provider 协议
      const needsConversion = protocol !== provider.providerProtocol
      let proxyBody: any = { ...body, model: targetModel }

      if (needsConversion) {
        if (protocol === 'openai' && provider.providerProtocol === 'anthropic') {
          proxyBody = openaiRequestToClaude({ ...body, model: targetModel })
        } else if (protocol === 'anthropic' && provider.providerProtocol === 'openai') {
          proxyBody = claudeRequestToOpenai({ ...body, model: targetModel })
        }
      }

      // 转换 thinking 参数为 Claude API 期望的格式
      if (requiresThinking) {
        // 移除旧格式的参数
        delete proxyBody.extended_thinking
        delete proxyBody.enable_thinking

        // 如果 thinking 不是对象或格式不正确，转换为标准格式
        if (typeof proxyBody.thinking !== 'object' || !proxyBody.thinking?.type) {
          proxyBody.thinking = {
            type: 'enabled',
            budget_tokens: 10000
          }
        }
      }

      console.log(`[${requestedModel}] -> [${provider.modelName}] via ${provider.baseUrl}${requiresThinking ? ' (thinking)' : ''}`)

      const reqHeaders: Record<string, string> = {}
      for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase()
        if (lowerKey !== 'authorization' && lowerKey !== 'host' && typeof value === 'string') {
          reqHeaders[key] = value
        }
      }
      const startTime = Date.now()

      try {
        const url = `${provider.baseUrl}${apiPath}`
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            connection: `keep-alive`,
            'content-type': reqHeaders['content-type'] || 'application/json',
          },
          body: JSON.stringify(proxyBody),
          signal: AbortSignal.timeout(TIMEOUT_MS)
        })

        const durationMs = Date.now() - startTime

        if (response.status === 403 || response.status === 401) {
          await this.setScoreToZero(provider.providerId)
          console.warn(`${response.status} 权限错误，健康分清零: ${provider.providerId}`)
        } else if (response.status === 404) {
          await this.setScoreToZero(provider.providerId)
          console.warn(`404 配置错误，健康分清零: ${provider.providerId}`)
        } else if (response.status === 429 || response.status === 400) {
          await this.updateScore(provider.providerId, -500)
        } else if (response.status === 500) {
          await this.updateScore(provider.providerId, -1000)
        } else if (response.status >= 500) {
          await this.updateScore(provider.providerId, -800)
        } else if (response.status >= 400) {
          await this.updateScore(provider.providerId, -300)
        } else if (response.ok) {
          const penalty = this.calcPenalty(durationMs, contentLength)
          await this.updateScore(provider.providerId, -penalty)
        }

        if (!response.body) {
          return { success: true, response }
        }

        const isStreaming = body.stream === true
        let usage: { input_tokens?: number; output_tokens?: number } | undefined

        if (!isStreaming) {
          const responseData = await response.json()
          usage = responseData.usage

          // 检测 400 错误中的 thinking 模式不支持错误
          if (response.status === 400 && requiresThinking) {
            const errorMessage = responseData?.error?.message || JSON.stringify(responseData)
            const isThinkingError =
              errorMessage.includes('thinking') &&
              (errorMessage.includes('Expected `thinking`') ||
                errorMessage.includes('redacted_thinking') ||
                errorMessage.includes('thinking block') ||
                errorMessage.includes('thinking: Field required'))

            if (isThinkingError) {
              await this.disableThinkingSupport(provider.providerId, provider.modelName)
              console.error(`检测到 thinking 模式不支持错误，已自动禁用: ${provider.modelName}`)
            }
          }

          await this.saveLog({
            providerId: provider.providerId,
            modelName: requestedModel,
            request: proxyBody,
            durationMs,
            isSuccess: response.ok,
            statusCode: response.status,
            usage,
            error: response.ok ? undefined : JSON.stringify(responseData)
          })

          // 响应协议转换
          let finalResponse = responseData
          if (needsConversion && response.ok) {
            if (protocol === 'openai' && provider.providerProtocol === 'anthropic') {
              finalResponse = claudeResponseToOpenai(responseData as ClaudeResponse)
            } else if (protocol === 'anthropic' && provider.providerProtocol === 'openai') {
              finalResponse = openaiResponseToClaude(responseData as OpenAIResponse)
            }
          }

          return {
            success: true,
            response: new Response(JSON.stringify(finalResponse), {
              status: response.status,
              headers: { 'Content-Type': 'application/json' }
            })
          }
        }

        const logId = await this.saveLog({
          providerId: provider.providerId,
          modelName: requestedModel,
          request: proxyBody,
          durationMs,
          isSuccess: response.ok,
          statusCode: response.status
        })

        const decoder = new TextDecoder()
        const encoder = new TextEncoder()
        let thinkingErrorDetected = false

        // 流式协议转换器
        const streamConverter = needsConversion
          ? protocol === 'openai' && provider.providerProtocol === 'anthropic'
            ? createClaudeToOpenaiStreamConverter()
            : protocol === 'anthropic' && provider.providerProtocol === 'openai'
              ? createOpenaiToClaudeStreamConverter()
              : null
          : null

        const monitoredBody = response.body.pipeThrough(new TransformStream({
          transform: (chunk, controller) => {
            const text = decoder.decode(chunk, { stream: true })
            const lines = text.split('\n').filter(line => line.startsWith('data: '))

            for (const line of lines) {
              try {
                const jsonStr = line.slice(6).trim()
                if (jsonStr === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  continue
                }
                const data = JSON.parse(jsonStr)

                // 检测流式响应中的 thinking 错误
                if (!thinkingErrorDetected && response.status === 400 && requiresThinking && data.error) {
                  const errorMessage = data.error.message || JSON.stringify(data.error)
                  const isThinkingError =
                    errorMessage.includes('thinking') &&
                    (errorMessage.includes('Expected `thinking`') ||
                      errorMessage.includes('redacted_thinking') ||
                      errorMessage.includes('thinking block') ||
                      errorMessage.includes('thinking: Field required'))

                  if (isThinkingError) {
                    thinkingErrorDetected = true
                    this.disableThinkingSupport(provider.providerId, provider.modelName).catch(console.error)
                    console.error(`检测到 thinking 模式不支持错误（流式），已自动禁用: ${provider.modelName}`)
                  }
                }

                if (data.usage) {
                  if (!usage) usage = {}
                  if (data.usage.input_tokens) usage.input_tokens = data.usage.input_tokens
                  if (data.usage.output_tokens) usage.output_tokens = data.usage.output_tokens
                }

                // 流式协议转换
                if (streamConverter) {
                  if (protocol === 'openai' && provider.providerProtocol === 'anthropic') {
                    const converted = (streamConverter as ReturnType<typeof createClaudeToOpenaiStreamConverter>)(data as ClaudeStreamEvent)
                    if (converted) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(converted)}\n\n`))
                    }
                  } else if (protocol === 'anthropic' && provider.providerProtocol === 'openai') {
                    const events = (streamConverter as ReturnType<typeof createOpenaiToClaudeStreamConverter>)(data as OpenAIStreamResponse)
                    for (const event of events) {
                      controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`))
                    }
                  }
                } else {
                  controller.enqueue(chunk)
                  return
                }
              } catch { }
            }
          },
          flush: async () => {
            if (logId && usage) {
              const totalTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0)
              if (totalTokens > 0) {
                await this.updateLog(logId, usage)
              }
            }
          }
        }))

        return {
          success: true,
          response: new Response(monitoredBody, {
            status: response.status,
            headers: response.headers
          })
        }
      } catch (error) {
        const durationMs = Date.now() - startTime
        const isTimeout = error instanceof Error && error.name === 'TimeoutError'
        await this.updateScore(provider.providerId, isTimeout ? -100 : -1000)
        console.error(`重试 ${attempt + 1}/${MAX_RETRIES}: ${provider.providerId}`, error)

        await this.saveLog({
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

  private async saveLog(params: {
    providerId: string
    modelName: string
    request: any
    durationMs: number
    isSuccess: boolean
    statusCode: number
    usage?: { input_tokens?: number; output_tokens?: number }
    error?: string
  }): Promise<string | undefined> {
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
      console.error('日志记录失败:', err)
      return undefined
    }
  }

  private async updateLog(logId: string, usage: { input_tokens?: number; output_tokens?: number }): Promise<void> {
    try {
      await useEntityManager(async m => {
        await m.update(LlmChatLog, logId, {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
        })
      })
    } catch (err) {
      console.error('更新 token 失败:', err)
    }
  }
}
