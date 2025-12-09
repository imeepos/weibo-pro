import 'reflect-metadata'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})
app.post('/v1/messages', async (c) => {
  const apiKey = `82956e56a119d60063c3cab701c7ba74.bxEZzx9O5jI9Egwe`
  if (!apiKey) {
    return c.json({ error: '缺少 API 密钥配置' }, 500)
  }
  const body = await c.req.json()
  const headers = new Headers(c.req.header())
  headers.set('Authorization', apiKey)
  const response = await fetch('https://open.bigmodel.cn/api/anthropic/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  return response;
})

// 错误处理
app.onError((err, c) => {
  console.error('错误:', err)
  return c.json({ error: '服务器错误', details: err.message }, 500)
})

// 404 处理
app.notFound((c) => {
  return c.json({ error: '端点不存在', path: c.req.path }, 404)
})

// 启动服务
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
