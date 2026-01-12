import { Controller, Get } from '@sker/core'
import { checkPostgreSQL, checkRedis, checkRabbitMQ, checkMongoDB } from '../config/startup-check'
import { success } from '../utils/api-response'

@Controller('health')
export class HealthController {
  @Get()
  async basic() {
    return success({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  }

  @Get('detailed')
  async detailed() {
    const env = process.env

    const checks = await Promise.all([
      checkPostgreSQL(env.DATABASE_URL || ''),
      checkRedis(env.REDIS_URL || ''),
      checkRabbitMQ(env.RABBITMQ_URL || ''),
      checkMongoDB(env.MONGODB_URL || ''),
    ])

    const allHealthy = checks.every(c => c.status === 'healthy')

    return success({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: checks,
    })
  }
}
