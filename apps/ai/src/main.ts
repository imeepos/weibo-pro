import 'reflect-metadata'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { useEntityManager, LlmModel, LlmProvider, LlmChatLog } from '@sker/entities'
import "dotenv/config";

const app = new Hono()

interface ProviderInfo {
  providerId: string
  baseUrl: string
  apiKey: string
  modelName: string
}

const findBestProvider = async (modelName: string): Promise<ProviderInfo | null> => {
  return useEntityManager(async m => {
    const result = await m.createQueryBuilder(LlmModel, 'model')
      .innerJoin('model.providers', 'mp')
      .innerJoin('mp.provider', 'provider')
      .select(['provider.id', 'provider.base_url', 'provider.api_key', 'provider.score', 'mp.modelName'])
      .where('model.name = :modelName', { modelName })
      .andWhere('provider.score > 0')
      .orderBy('provider.score', 'DESC')
      .getRawOne()

    if (!result) return null

    return {
      providerId: result.provider_id,
      baseUrl: result.provider_base_url,
      apiKey: result.provider_api_key,
      modelName: result.mp_model_name
    }
  })
}

const updateScore = async (providerId: string, delta: number) => {
  await useEntityManager(async m => {
    await m.createQueryBuilder()
      .update(LlmProvider)
      .set({ score: () => `GREATEST(0, score + ${delta})` })
      .where('id = :providerId', { providerId })
      .execute()
  })
}
app.use(async (c, next) => {
  await next()
})
const TIMEOUT_MS = 30000
const IDLE_TIMEOUT_MS = 15000

const calcPenalty = (responseMs: number, contentLength: number): number => {
  const len = Math.max(contentLength, 100)
  const raw = Math.ceil(responseMs / len * 0.1)
  return Math.min(10, Math.max(1, raw))
}

const withIdleTimeout = (body: ReadableStream<Uint8Array>, timeoutMs: number, onTimeout: () => void) => {
  let timer: ReturnType<typeof setTimeout>
  const resetTimer = () => {
    clearTimeout(timer)
    timer = setTimeout(onTimeout, timeoutMs)
  }
  resetTimer()
  return body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      resetTimer()
      console.log(chunk.length)
      controller.enqueue(chunk)
    },
    flush() { clearTimeout(timer) }
  }))
}

const MAX_RETRIES = 3

app.post('/:model/v1/messages', async (c) => {
  const body = await c.req.json()
  const modelName = c.req.param('model')
  const contentLength = parseInt(c.req.header('content-length') || '0')
  const triedProviders = new Set<string>()

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const provider = await findBestProvider(modelName)
    if (!provider || triedProviders.has(provider.providerId)) {
      return c.json({ error: `无可用 provider: ${modelName}` }, 503)
    }
    triedProviders.add(provider.providerId)

    const headers = new Headers(c.req.header())
    headers.set('Authorization', `Bearer ${provider.apiKey}`)
    const startTime = Date.now()

    try {
      const url = `${provider.baseUrl}/v1/messages`
      console.log(`${body.model}:${url}`)
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })

      const durationMs = Date.now() - startTime
      const penalty = calcPenalty(durationMs, contentLength)
      await updateScore(provider.providerId, -penalty)

      if (!response.body) return response

      const isStreaming = body.stream === true
      let usage: { input_tokens?: number; output_tokens?: number } | undefined

      if (!isStreaming && response.ok) {
        const responseData = await response.json()
        usage = responseData.usage

        await useEntityManager(async m => {
          await m.save(LlmChatLog, {
            providerId: provider.providerId,
            modelName: body.model,
            request: body,
            durationMs,
            isSuccess: true,
            statusCode: response.status,
            promptTokens: usage?.input_tokens,
            completionTokens: usage?.output_tokens,
            totalTokens: usage ? (usage.input_tokens || 0) + (usage.output_tokens || 0) : undefined
          })
        }).catch(err => console.error('日志记录失败:', err))

        return c.json(responseData, response.status as 200)
      }

      let logId: string | undefined
      await useEntityManager(async m => {
        const log = await m.save(LlmChatLog, {
          providerId: provider.providerId,
          modelName: body.model,
          request: body,
          durationMs,
          isSuccess: response.ok,
          statusCode: response.status
        })
        logId = log.id
      }).catch(err => console.error('日志记录失败:', err))

      const decoder = new TextDecoder()
      const monitoredBody = withIdleTimeout(response.body, IDLE_TIMEOUT_MS, () => {
        updateScore(provider.providerId, -10)
        console.error(`流空闲超时: ${provider.providerId}`)
      }).pipeThrough(new TransformStream({
        transform(chunk, controller) {
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
            } catch {}
          }

          controller.enqueue(chunk)
        },
        async flush() {
          console.log(usage)
          if (logId && usage) {
            const totalTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0)
            if (totalTokens > 0) {
              await useEntityManager(async m => {
                await m.update(LlmChatLog, logId!, {
                  promptTokens: usage!.input_tokens,
                  completionTokens: usage!.output_tokens,
                  totalTokens
                })
              }).catch(err => console.error('更新 token 失败:', err))
            }
          }
        }
      }))

      return new Response(monitoredBody, {
        status: response.status,
        headers: response.headers
      })
    } catch (error) {
      const durationMs = Date.now() - startTime
      const isTimeout = error instanceof Error && error.name === 'TimeoutError'
      await updateScore(provider.providerId, isTimeout ? -100 : -300)
      console.error(`重试 ${attempt + 1}/${MAX_RETRIES}: ${provider.providerId}`, error)

      await useEntityManager(async m => {
        await m.save(LlmChatLog, {
          providerId: provider.providerId,
          modelName: provider.modelName,
          request: body,
          durationMs,
          isSuccess: false,
          statusCode: 0,
          error: error instanceof Error ? error.message : String(error)
        })
      }).catch(err => console.error('日志记录失败:', err))
    }
  }

  return c.json({ error: '所有 provider 均失败' }, 503)
})

app.onError((err, c) => {
  console.error('错误:', err)
  return c.json({ error: '服务器错误', details: err.message }, 500)
})

app.notFound((c) => {
  return c.json({ error: '端点不存在', path: c.req.path }, 404)
})

const port = process.env.PORT ? parseInt(process.env.PORT) : 8088
serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`🚀 AI 服务运行于 http://localhost:${info.port}`)
  }
)
