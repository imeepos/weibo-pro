import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

export const createOpenAPIApp = () => {
  return new OpenAPIHono({
    defaultHook: (result: any, c: any) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: '请求参数验证失败',
              details: result.error.errors,
              timestamp: new Date().toISOString(),
            },
          },
          400
        )
      }
    },
  })
}

export const createOpenAPIRoute = createRoute

export const commonResponses = {
  200: {
    description: '成功',
    content: {
      'application/json': {
        schema: z.object({
          success: z.boolean(),
          data: z.any().optional(),
          meta: z.object({
            timestamp: z.string(),
          }),
        }),
      },
    },
  },
  400: {
    description: '请求参数错误',
    content: {
      'application/json': {
        schema: z.object({
          success: z.boolean(),
          error: z.object({
            code: z.string(),
            message: z.string(),
            timestamp: z.string(),
          }),
        }),
      },
    },
  },
  401: {
    description: '未授权',
    content: {
      'application/json': {
        schema: z.object({
          success: z.boolean(),
          error: z.object({
            code: z.string(),
            message: z.string(),
            timestamp: z.string(),
          }),
        }),
      },
    },
  },
  500: {
    description: '服务器错误',
    content: {
      'application/json': {
        schema: z.object({
          success: z.boolean(),
          error: z.object({
            code: z.string(),
            message: z.string(),
            timestamp: z.string(),
          }),
        }),
      },
    },
  },
}

export const openAPISpec = {
  openapi: '3.0.0',
  info: {
    title: 'Weibo-Pro API',
    version: '1.0.0',
    description: '微博舆情分析平台 API',
  },
  servers: [
    {
      url: 'http://localhost:8089',
      description: '开发环境',
    },
    {
      url: 'https://api.weibo-pro.example.com',
      description: '生产环境',
    },
  ],
  tags: [
    { name: 'health', description: '健康检查' },
    { name: 'auth', description: '认证授权' },
    { name: 'keywords', description: '关键词分析' },
    { name: 'workflows', description: '工作流' },
    { name: 'crawler', description: '爬虫' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
}
