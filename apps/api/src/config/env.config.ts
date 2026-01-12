import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(() => 3000),
  DEV: z.string().transform((v: string) => v === 'true').default(() => false),
  TZ: z.string().default('UTC'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  RABBITMQ_URL: z.string().url(),
  MONGODB_URL: z.string().url(),

  OPENAI_BASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  AMAP_API_KEY: z.string().min(1),

  API_BASE_URL: z.string().url().default('http://localhost:8089'),
  S3_BASE_URL: z.string().url().default('http://localhost:8089'),

  KUAIDAILI_SECRET_ID: z.string().optional(),
  KUAIDAILI_SECRET_KEY: z.string().optional(),
  KUAIDAILI_USERNAME: z.string().optional(),
  KUAIDAILI_PASSWORD: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null

export function validateEnv(): Env {
  if (cachedEnv) return cachedEnv

  try {
    cachedEnv = envSchema.parse(process.env)
    return cachedEnv
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e: any) => `  - ${e.path.join('.')}: ${e.message}`).join('\n')
      throw new Error(
        '环境变量验证失败:\n' +
        missingVars +
        '\n\n请检查 .env 文件或环境变量配置'
      )
    }
    if (error instanceof Error) {
      throw new Error(`环境变量验证失败: ${error.message}`)
    }
    throw error
  }
}

export function getEnv(): Env {
  if (!cachedEnv) {
    return validateEnv()
  }
  return cachedEnv
}
