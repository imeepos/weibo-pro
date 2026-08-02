import { describe, it, expect, beforeEach } from 'vitest'
import { useDataSource, useEntityManager } from '../utils'
import type { DataSource } from 'typeorm'

/**
 * useEntityManager 连接泄露集成测试
 *
 * 测试目标：
 * 1. 验证多次调用 useEntityManager 不会触发不必要的重连
 * 2. 验证 DataSource 单例模式正常工作
 * 3. 模拟持续调度场景（快速连续调用50次）
 *
 * 前提条件：
 * - 需要 DATABASE_URL 环境变量
 * - 如果没有真实数据库，此测试会被跳过
 */

describe('useEntityManager - 连接泄露集成测试', () => {
  let dataSourceInstance: DataSource | null = null
  let hasDatabase = false

  beforeEach(async () => {
    // 检查是否有数据库连接
    if (!process.env.DATABASE_URL) {
      hasDatabase = false
      return
    }

    try {
      dataSourceInstance = await useDataSource()
      hasDatabase = !!dataSourceInstance
    } catch (_error) {
      hasDatabase = false
      console.warn('⚠️  无法连接数据库，跳过集成测试')
    }
  })

  it('多次调用 useDataSource 应该返回同一个实例', async () => {
    if (!hasDatabase) {
      console.warn('⚠️  没有数据库连接，跳过测试')
      return
    }

    // 获取多个实例
    const instance1 = await useDataSource()
    const instance2 = await useDataSource()
    const instance3 = await useDataSource()

    // 应该都是同一个实例
    expect(instance1).toBe(instance2)
    expect(instance2).toBe(instance3)
    expect(instance1).toBe(dataSourceInstance)
  })

  it('快速连续调用 useEntityManager 不应该创建新 DataSource', async () => {
    if (!hasDatabase) {
      console.warn('⚠️  没有数据库连接，跳过测试')
      return
    }

    // 记录初始实例
    const initialInstance = await useDataSource()
    const initialDriver = initialInstance.driver

    // 快速连续调用 50 次（模拟持续调度场景）
    for (let i = 0; i < 50; i++) {
      try {
        await useEntityManager(async (manager) => {
          // 执行一个简单查询
          await manager.query('SELECT 1')
        })
      } catch (_error) {
        // 忽略查询错误，我们只关心 DataSource 实例
      }
    }

    // 验证 DataSource 实例没有改变
    const finalInstance = await useDataSource()
    const finalDriver = finalInstance.driver

    expect(finalInstance).toBe(initialInstance)
    expect(finalDriver).toBe(initialDriver)

    console.log('✅ 50 次调用后，DataSource 实例保持不变')
  })

  it('并发调用 useEntityManager 不应该创建新 DataSource', async () => {
    if (!hasDatabase) {
      console.warn('⚠️  没有数据库连接，跳过测试')
      return
    }

    const initialInstance = await useDataSource()

    // 并发调用 20 次
    const promises = Array.from({ length: 20 }, async () => {
      try {
        return await useEntityManager(async (manager) => {
          await manager.query('SELECT 1')
          return true
        })
      } catch (_error) {
        return false
      }
    })

    await Promise.all(promises)

    // 验证 DataSource 实例没有改变
    const finalInstance = await useDataSource()
    expect(finalInstance).toBe(initialInstance)

    console.log('✅ 20 个并发调用后，DataSource 实例保持不变')
  })

  it('模拟持续调度场景：快速多次调用', async () => {
    if (!hasDatabase) {
      console.warn('⚠️  没有数据库连接，跳过测试')
      return
    }

    const initialInstance = await useDataSource()
    const callCount = 20
    const startTime = Date.now()

    for (let i = 0; i < callCount; i++) {
      try {
        await useEntityManager(async (manager) => {
          // 模拟查询操作
          await manager.query('SELECT 1')
        })
      } catch (_error) {
        // 忽略错误
      }

      // 模拟持续调度的间隔（100ms）
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    const duration = Date.now() - startTime
    const finalInstance = await useDataSource()

    expect(finalInstance).toBe(initialInstance)

    console.log(`✅ ${callCount} 次调用（耗时 ${duration}ms）后，DataSource 实例保持不变`)
  })
})
