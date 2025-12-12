import { Injectable } from '@sker/core';
import { useEntityManager, LlmModel, LlmModelProvider, LlmProvider, LlmChatLog } from '@sker/entities';

interface ProviderInfo {
  providerId: string
  baseUrl: string
  apiKey: string
  modelName: string
}

interface ProxyResult {
  success: boolean
  response?: Response
  error?: string
}

const TIMEOUT_MS = 30000
const IDLE_TIMEOUT_MS = 15000
const MAX_RETRIES = 3

@Injectable({ providedIn: 'root' })
export class LlmProxyService {

  async findProvider(requestedModel: string, protocol: string, excludeIds: Set<string> = new Set()): Promise<ProviderInfo | null> {
    if (!requestedModel) return null

    return useEntityManager(async m => {
      // 先按供应商模型名查找
      const qb1 = m.createQueryBuilder(LlmModelProvider, 'mp')
        .innerJoin('mp.provider', 'provider')
        .select(['provider.id', 'provider.base_url', 'provider.api_key', 'provider.score', 'mp.modelName'])
        .where('mp.modelName = :requestedModel', { requestedModel })
        .andWhere('provider.protocol = :protocol', { protocol })
        .andWhere('provider.score > 0')

      if (excludeIds.size > 0) {
        qb1.andWhere('provider.id NOT IN (:...excludeIds)', { excludeIds: [...excludeIds] })
      }

      let result = await qb1.orderBy('provider.score', 'DESC').getRawOne()

      // 找不到则按标准模型名查找
      if (!result?.provider_id) {
        const qb2 = m.createQueryBuilder(LlmModel, 'model')
          .innerJoin('model.providers', 'mp')
          .innerJoin('mp.provider', 'provider')
          .select(['provider.id', 'provider.base_url', 'provider.api_key', 'provider.score', 'mp.modelName'])
          .where('model.name = :requestedModel', { requestedModel })
          .andWhere('provider.protocol = :protocol', { protocol })
          .andWhere('provider.score > 0')

        if (excludeIds.size > 0) {
          qb2.andWhere('provider.id NOT IN (:...excludeIds)', { excludeIds: [...excludeIds] })
        }

        result = await qb2.orderBy('provider.score', 'DESC').getRawOne()
      }

      if (!result?.provider_id) return null
      return {
        providerId: result.provider_id,
        baseUrl: result.provider_base_url,
        apiKey: result.provider_api_key,
        modelName: result.mp_model_name
      }
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

  private calcPenalty(responseMs: number, contentLength: number): number {
    const len = Math.max(contentLength, 100)
    const raw = Math.ceil(responseMs / len * 0.1)
    return Math.min(10, Math.max(1, raw))
  }

  private withIdleTimeout(body: ReadableStream<Uint8Array>, timeoutMs: number, onTimeout: () => void): ReadableStream<Uint8Array> {
    let timer: ReturnType<typeof setTimeout>
    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(onTimeout, timeoutMs)
    }
    resetTimer()
    return body.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        resetTimer()
        controller.enqueue(chunk)
      },
      flush() { clearTimeout(timer) }
    }))
  }

  async proxyRequest(protocol: string, apiPath: string, body: any, headers: Record<string, string>, contentLength: number): Promise<ProxyResult> {
    const triedProviders = new Set<string>()
    const requestedModel = body.model

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const provider = await this.findProvider(requestedModel, protocol, triedProviders)
      if (!provider) {
        return { success: false, error: `无可用 provider: ${requestedModel} (${protocol})` }
      }
      triedProviders.add(provider.providerId)

      const proxyBody = { ...body, model: provider.modelName }
      console.log(`[${requestedModel}] -> [${provider.modelName}] via ${provider.baseUrl}`)

      const reqHeaders: Record<string, string> = { ...headers, 'Authorization': `Bearer ${provider.apiKey}` }
      const startTime = Date.now()

      try {
        const url = `${provider.baseUrl}${apiPath}`
        const response = await fetch(url, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify(proxyBody),
          signal: AbortSignal.timeout(TIMEOUT_MS)
        })

        const durationMs = Date.now() - startTime
        const penalty = this.calcPenalty(durationMs, contentLength)
        await this.updateScore(provider.providerId, -penalty)

        if (!response.body) {
          return { success: true, response }
        }

        const isStreaming = body.stream === true
        let usage: { input_tokens?: number; output_tokens?: number } | undefined

        if (!isStreaming && response.ok) {
          const responseData = await response.json()
          usage = responseData.usage

          await this.saveLog({
            providerId: provider.providerId,
            modelName: requestedModel,
            request: proxyBody,
            durationMs,
            isSuccess: true,
            statusCode: response.status,
            usage
          })

          return {
            success: true,
            response: new Response(JSON.stringify(responseData), {
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
        const monitoredBody = this.withIdleTimeout(response.body, IDLE_TIMEOUT_MS, () => {
          this.updateScore(provider!.providerId, -10)
          console.error(`流空闲超时: ${provider!.providerId}`)
        }).pipeThrough(new TransformStream({
          transform: (chunk, controller) => {
            const text = decoder.decode(chunk, { stream: true })
            const lines = text.split('\n').filter(line => line.startsWith('data: '))

            for (const line of lines) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.usage) {
                  if (!usage) usage = {}
                  if (data.usage.input_tokens) usage.input_tokens = data.usage.input_tokens
                  if (data.usage.output_tokens) usage.output_tokens = data.usage.output_tokens
                }
              } catch { }
            }
            controller.enqueue(chunk)
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
        await this.updateScore(provider.providerId, isTimeout ? -100 : -300)
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
