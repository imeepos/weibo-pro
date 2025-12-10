import 'reflect-metadata'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { useEntityManager, LlmModel, LlmProvider } from '@sker/entities'
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

app.post('/v1/messages', async (c) => {
  const body = await c.req.json()
  const modelName = body.model as string

  const provider = await findBestProvider(modelName)
  if (!provider) {
    return c.json({ error: `无可用 provider: ${modelName}` }, 503)
  }

  const headers = new Headers(c.req.header())
  headers.set('Authorization', `Bearer ${provider.apiKey}`)

  const requestBody = { ...body, model: provider.modelName }

  try {
    const response = await fetch(`${provider.baseUrl}/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    await updateScore(provider.providerId, -1)

    return response
  } catch (error) {
    await updateScore(provider.providerId, -100)
    throw error
  }
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
