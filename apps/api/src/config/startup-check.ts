import { Pool } from 'pg'
import { createClient } from 'redis'
import { connect } from 'amqplib'
import { MongoClient } from 'mongodb'
import { Logger } from '@sker/core'

export interface HealthCheckResult {
  name: string
  status: 'healthy' | 'unhealthy'
  message?: string
  latency?: number
}

export async function checkPostgreSQL(connectionString: string): Promise<HealthCheckResult> {
  const start = Date.now()
  const pool = new Pool({ connectionString })

  try {
    await pool.query('SELECT 1')
    await pool.end()
    return {
      name: 'PostgreSQL',
      status: 'healthy',
      latency: Date.now() - start
    }
  } catch (error) {
    return {
      name: 'PostgreSQL',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function checkRedis(connectionString: string): Promise<HealthCheckResult> {
  const start = Date.now()
  const client = createClient({ url: connectionString })

  try {
    await client.connect()
    await client.ping()
    await client.quit()
    return {
      name: 'Redis',
      status: 'healthy',
      latency: Date.now() - start
    }
  } catch (error) {
    return {
      name: 'Redis',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function checkRabbitMQ(connectionString: string): Promise<HealthCheckResult> {
  const start = Date.now()

  try {
    const connection = await connect(connectionString)
    await connection.close()
    return {
      name: 'RabbitMQ',
      status: 'healthy',
      latency: Date.now() - start
    }
  } catch (error) {
    return {
      name: 'RabbitMQ',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function checkMongoDB(connectionString: string): Promise<HealthCheckResult> {
  const start = Date.now()

  try {
    const client = new MongoClient(connectionString)
    await client.connect()
    await client.db().admin().ping()
    await client.close()
    return {
      name: 'MongoDB',
      status: 'healthy',
      latency: Date.now() - start
    }
  } catch (error) {
    return {
      name: 'MongoDB',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function runStartupChecks(env: any, logger: Logger): Promise<boolean> {
  logger.info('开始启动时健康检查...')

  const checks = [
    () => checkPostgreSQL(env.DATABASE_URL),
    () => checkRedis(env.REDIS_URL),
    () => checkRabbitMQ(env.RABBITMQ_URL),
    () => checkMongoDB(env.MONGODB_URL)
  ]

  const results = await Promise.all(checks.map(check => check()))
  let allHealthy = true

  for (const result of results) {
    if (result.status === 'healthy') {
      logger.info(`✓ ${result.name} 连接正常${result.latency ? ` (${result.latency}ms)` : ''}`)
    } else {
      logger.error(`✗ ${result.name} 连接失败: ${result.message}`)
      allHealthy = false
    }
  }

  if (allHealthy) {
    logger.info('所有服务健康检查通过')
  } else {
    logger.warn('部分服务健康检查未通过，服务可能无法正常工作')
  }

  return allHealthy
}
