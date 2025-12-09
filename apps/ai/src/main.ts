import 'reflect-metadata'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

const bigmodel = async (header: any, body: any) => {
  // 模型负载均衡
  const headers = new Headers(header)
  headers.set('Authorization', `Bearer 82956e56a119d60063c3cab701c7ba74.bxEZzx9O5jI9Egwe`)
  const response = await fetch('https://open.bigmodel.cn/api/anthropic/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  return response;
}

const minimax = async (header: any, body: any) => {
  // 模型负载均衡
  const headers = new Headers(header)
  headers.set('Authorization', `Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiLmnajmmI7mmI4iLCJVc2VyTmFtZSI6IuadqOaYjuaYjiIsIkFjY291bnQiOiIiLCJTdWJqZWN0SUQiOiIxOTY3NDc0OTI5OTU5OTY5MDQ2IiwiUGhvbmUiOiIiLCJHcm91cElEIjoiMTk2NzQ3NDkyOTk1MTU3NjM0MiIsIlBhZ2VOYW1lIjoiIiwiTWFpbCI6InltaW5nbWluZzM3NUBnbWFpbC5jb20iLCJDcmVhdGVUaW1lIjoiMjAyNS0xMC0zMSAxMDoxNjoxOSIsIlRva2VuVHlwZSI6MSwiaXNzIjoibWluaW1heCJ9.Ub6N1CCACkwGQjyrkh6lMYKJOsUPo1w4QtOErBZfJoi71VhAT4tJsOtw8lF0EBlLowE7eeUWNGzZYZ-Vfo4ho14wlxv9FJylOVo48CgYPNnKvKdQBCWENTyd_vcQp7k_zKs4PK-PMKka6hbG2wCp7V_4aOmZeD25VpRbRf9cFU8hzEZCCwMfztDgd-hXY6i1gR0vCvz8aot6EmriN-6vHWms2FpVAtaBveaHrmNIKM3A2glFE0gh-6jMQszfWcVz6s7Gi5qgJ7uM3y6EJ4IfOcglAPM_et9Fwlqz-OQwZhg-mDWPPZWXL0NUQjFvV6h6Q2SxAmjL-6OLaRZrfR6wDw`)
  const response = await fetch('https://api.minimax.io/anthropic/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  return response;
}

const cc12137207134 = async (header: any, body: any) => {
  // 模型负载均衡
  const headers = new Headers(header)
  headers.set('Authorization', `Bearer sk-A6DtbqEHYT7cGp2psCuUVywkij0kN2mPcuTTy3CGfLDDso0y`)
  const response = await fetch('http://121.37.207.134:8000/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  return response;
}

app.post('/v1/messages', async (c) => {
  const body = await c.req.json()
  const { messages } = body;
  if (messages && messages.length > 5) {
    body.messages = messages.slice(-5)
  }
  return cc12137207134(c.req.header(), body)
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
