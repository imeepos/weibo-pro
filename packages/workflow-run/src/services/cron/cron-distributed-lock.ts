import { logger } from '@sker/core'
import type { RedisClient } from '@sker/redis'

/**
 * 分布式锁接口
 */
export interface LockService {
  tryLock(key: string, ttl: number): Promise<boolean>
  release(key: string): Promise<void>
}

/**
 * 基于 Redis SETNX + EXPIRE 的分布式锁
 *
 * 优雅设计：
 * - 使用 SETNX 获取锁，避免多实例重复执行
 * - 获取成功后设置过期时间，防止死锁
 */
export class DistributedLock implements LockService {
  constructor(private redis: RedisClient) {}

  async tryLock(key: string, ttl: number): Promise<boolean> {
    try {
      // 使用 SETNX 获取锁
      const result = await this.redis.setnx(key, '1')

      if (result === 1) {
        // 获取锁成功，设置过期时间
        await this.redis.expire(key, ttl)
        return true
      }

      return false
    } catch (error) {
      logger.error('获取分布式锁失败', {
        key,
        error: (error as Error).message
      })
      return false
    }
  }

  async release(key: string): Promise<void> {
    await this.redis.del(key)
  }
}
