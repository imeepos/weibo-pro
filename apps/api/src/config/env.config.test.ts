import { describe, expect, it, vi } from 'vitest'

const validEnv = {
  NODE_ENV: 'production',
  PORT: '8089',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vectordb',
  REDIS_URL: 'redis://localhost:6379',
  RABBITMQ_URL: 'amqp://localhost:5672',
  MONGODB_URL: 'mongodb://localhost:27017/appdb',
  OPENAI_BASE_URL: 'https://api.example.com/v1',
  OPENAI_API_KEY: 'test-key',
  AMAP_API_KEY: 'test-amap-key',
}

describe('validateEnv', () => {
  it('requires BETTER_AUTH_SECRET in production', async () => {
    vi.resetModules()
    process.env = { ...validEnv }

    const { validateEnv } = await import('./env.config')

    expect(() => validateEnv()).toThrow(/BETTER_AUTH_SECRET/)
  })

  it('accepts a configured BETTER_AUTH_SECRET', async () => {
    vi.resetModules()
    process.env = {
      ...validEnv,
      BETTER_AUTH_SECRET: '0123456789abcdef0123456789abcdef',
    }

    const { validateEnv } = await import('./env.config')

    expect(validateEnv().BETTER_AUTH_SECRET).toBe('0123456789abcdef0123456789abcdef')
  })
})
