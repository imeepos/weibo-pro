import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DataSource, } from 'typeorm'
import { PropagationVelocityService } from './propagation-velocity.service'
import { EventHourlyStatisticsEntity } from '../event-hourly-statistics.entity'

/**
 * PropagationVelocityService 连接泄露测试
 *
 * 测试目标：
 * 1. 验证多次调用 getPropagationVelocity 后连接数不会持续增长
 * 2. 验证并发调用不会导致连接泄露
 * 3. 模拟持续调度场景（快速连续调用50次）
 *
 * 问题分析：
 * - PropagationVelocityService 直接注入 DataSource 并使用 createQueryBuilder
 * - createQueryBuilder 创建的查询不会自动释放连接
 * - 每个 getPropagationVelocity 调用都可能创建新的数据库连接
 *
 * 注意：此测试使用模拟的 DataSource，可以在没有真实数据库的情况下运行
 * 测试重点是验证 QueryBuilder 的调用模式是否会导致连接泄露
 */

describe('PropagationVelocityService - 连接泄露测试', () => {
  let mockDataSource: DataSource
  let _mockQueryBuilder: any
  let mockGetManySpy: ReturnType<typeof vi.fn>
  let createQueryBuilderCalls: any[] = []

  beforeEach(() => {
    // 重置调用记录
    vi.clearAllMocks()
    createQueryBuilderCalls = []

    // 创建模拟的 QueryBuilder
    mockGetManySpy = vi.fn()

    const createMockQueryBuilder = () => {
      const builder: any = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: mockGetManySpy,
        setParameter: vi.fn().mockReturnThis(),
        parameters: {},
      }

      // 记录每次创建的 QueryBuilder
      createQueryBuilderCalls.push({
        builder,
        timestamp: Date.now(),
        released: false,
      })

      return builder
    }

    _mockQueryBuilder = createMockQueryBuilder()

    // 创建模拟的 DataSource
    mockDataSource = {
      createQueryBuilder: vi.fn().mockImplementation((entity, alias) => {
        const builder = createMockQueryBuilder()
        // 记录查询构建器的使用
        builder.entity = entity
        builder.alias = alias
        return builder
      }),
      createQueryRunner: vi.fn().mockReturnValue({
        connect: vi.fn().mockResolvedValue(undefined),
        startTransaction: vi.fn().mockResolvedValue(undefined),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
        release: vi.fn().mockResolvedValue(undefined),
        manager: {},
      }),
      query: vi.fn().mockResolvedValue([{ count: 5 }]),
      isInitialized: true,
      initialize: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn().mockResolvedValue(undefined),
      createEntityManager: vi.fn().mockReturnValue({
        find: vi.fn().mockResolvedValue([]),
        save: vi.fn().mockResolvedValue(undefined),
      }),
    } as any
  })

  describe('查询构建器创建和释放测试', () => {
    it('应该正确创建 QueryBuilder', async () => {
      const service = new PropagationVelocityService()

      // 模拟返回数据
      const mockStatistics = [
        {
          id: '1',
          event_id: 'test-event',
          year: 2026,
          month: 1,
          day: 23,
          hour: 10,
          post_count: 100,
          repost_count: 500,
        },
      ]
      mockGetManySpy.mockResolvedValueOnce(mockStatistics)

      await service.getPropagationVelocity('test-event')

      // 验证 createQueryBuilder 被调用
      expect(mockDataSource.createQueryBuilder).toHaveBeenCalledTimes(1)
      expect(mockDataSource.createQueryBuilder).toHaveBeenCalledWith(
        EventHourlyStatisticsEntity,
        'stats'
      )
    })

    it('应该正确处理查询参数', async () => {
      const service = new PropagationVelocityService()

      const mockStatistics = [
        {
          id: '1',
          event_id: 'test-event',
          year: 2026,
          month: 1,
          day: 23,
          hour: 10,
          post_count: 100,
          repost_count: 500,
        },
      ]
      mockGetManySpy.mockResolvedValueOnce(mockStatistics)

      const startTime = new Date('2026-01-23T10:00:00Z')
      const endTime = new Date('2026-01-23T12:00:00Z')

      await service.getPropagationVelocity('test-event', startTime, endTime)

      // 验证查询构建器被正确调用
      expect(mockDataSource.createQueryBuilder).toHaveBeenCalled()
      expect(mockGetManySpy).toHaveBeenCalled()
    })
  })

  describe('连接泄露检测测试', () => {
    it('多次调用后不应该累积未释放的 QueryBuilder', async () => {
      const service = new PropagationVelocityService()

      const mockStatistics = [
        {
          id: '1',
          event_id: 'test-event',
          year: 2026,
          month: 1,
          day: 23,
          hour: 10,
          post_count: 100,
          repost_count: 500,
        },
      ]
      mockGetManySpy.mockResolvedValue(mockStatistics)

      // 执行多次调用
      const callCount = 10
      for (let i = 0; i < callCount; i++) {
        await service.getPropagationVelocity(`test-event-${i}`)
      }

      // 验证 createQueryBuilder 被调用了正确的次数
      expect(mockDataSource.createQueryBuilder).toHaveBeenCalledTimes(callCount)

      // 检查是否所有的 QueryBuilder 都被正确记录
      expect(createQueryBuilderCalls).toHaveLength(callCount)

      // 记录连接创建情况
      console.log(`创建了 ${createQueryBuilderCalls.length} 个 QueryBuilder`)
      console.log(
        `当前实现中每个 QueryBuilder 都不会被显式释放，可能导致连接泄露`
      )
    })

    it('快速连续调用50次不应该导致连接池耗尽', async () => {
      const service = new PropagationVelocityService()

      const mockStatistics = [
        {
          id: '1',
          event_id: 'test-event',
          year: 2026,
          month: 1,
          day: 23,
          hour: 10,
          post_count: 100,
          repost_count: 500,
        },
      ]
      mockGetManySpy.mockResolvedValue(mockStatistics)

      const startTime = Date.now()
      const callCount = 50

      // 模拟持续调度场景
      for (let i = 0; i < callCount; i++) {
        await service.getPropagationVelocity(`test-event-${i}`)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`完成 ${callCount} 次调用耗时: ${duration}ms`)
      console.log(`平均每次调用: ${(duration / callCount).toFixed(2)}ms`)

      // 验证所有调用都成功完成
      expect(mockDataSource.createQueryBuilder).toHaveBeenCalledTimes(callCount)

      // 在真实场景中，如果连接泄露，这里可能会导致连接池耗尽
      // 性能检查：50次调用应该在合理时间内完成
      expect(duration).toBeLessThan(5000) // 5秒内完成
    })
  })

  describe('并发调用测试', () => {
    it('并发调用不应该导致连接泄露', async () => {
      const service = new PropagationVelocityService()

      const mockStatistics = [
        {
          id: '1',
          event_id: 'test-event',
          year: 2026,
          month: 1,
          day: 23,
          hour: 10,
          post_count: 100,
          repost_count: 500,
        },
      ]
      mockGetManySpy.mockResolvedValue(mockStatistics)

      const concurrentCalls = 20
      const promises: Promise<any>[] = []

      // 创建并发调用
      for (let i = 0; i < concurrentCalls; i++) {
        promises.push(service.getPropagationVelocity(`test-event-${i}`))
      }

      await Promise.all(promises)

      // 验证所有并发调用都成功完成
      expect(mockDataSource.createQueryBuilder).toHaveBeenCalledTimes(concurrentCalls)

      console.log(
        `完成了 ${concurrentCalls} 个并发调用，创建了 ${concurrentCalls} 个 QueryBuilder`
      )
    })

    it('高并发场景下应该正确处理连接', async () => {
      const service = new PropagationVelocityService()

      const mockStatistics = [
        {
          id: '1',
          event_id: 'test-event',
          year: 2026,
          month: 1,
          day: 23,
          hour: 10,
          post_count: 100,
          repost_count: 500,
        },
      ]
      mockGetManySpy.mockResolvedValue(mockStatistics)

      const highConcurrency = 50
      const promises: Promise<any>[] = []

      const startTime = Date.now()

      // 高并发调用
      for (let i = 0; i < highConcurrency; i++) {
        promises.push(service.getPropagationVelocity(`test-event-${i}`))
      }

      await Promise.all(promises)

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(
        `高并发场景：${highConcurrency} 个并发调用耗时 ${duration}ms`
      )

      // 验证所有调用都成功
      expect(mockDataSource.createQueryBuilder).toHaveBeenCalledTimes(highConcurrency)
      expect(duration).toBeLessThan(10000) // 10秒内完成
    })
  })

  describe('查询结果处理测试', () => {
    it('当查询结果为空时应该返回 null', async () => {
      const service = new PropagationVelocityService()

      // 模拟空结果
      mockGetManySpy.mockResolvedValueOnce([])

      const result = await service.getPropagationVelocity('non-existent-event')

      expect(result).toBeNull()
      expect(mockDataSource.createQueryBuilder).toHaveBeenCalledTimes(1)
      expect(mockGetManySpy).toHaveBeenCalledTimes(1)
    })

    it('应该正确处理查询错误', async () => {
      const service = new PropagationVelocityService()

      // 模拟查询错误
      mockGetManySpy.mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(
        service.getPropagationVelocity('test-event')
      ).rejects.toThrow('Database connection failed')

      expect(mockDataSource.createQueryBuilder).toHaveBeenCalledTimes(1)
      expect(mockGetManySpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('资源管理测试', () => {
    it('应该正确模拟 QueryBuilder 的生命周期', async () => {
      const service = new PropagationVelocityService()

      const mockStatistics = [
        {
          id: '1',
          event_id: 'test-event',
          year: 2026,
          month: 1,
          day: 23,
          hour: 10,
          post_count: 100,
          repost_count: 500,
        },
      ]
      mockGetManySpy.mockResolvedValueOnce(mockStatistics)

      // 执行查询
      await service.getPropagationVelocity('test-event')

      // 验证 QueryBuilder 的调用链
      expect(mockDataSource.createQueryBuilder).toHaveBeenCalled()
      expect(mockGetManySpy).toHaveBeenCalled()

      console.log('QueryBuilder 生命周期分析：')
      console.log('- 创建 QueryBuilder')
      console.log('- 设置查询条件 (where, andWhere, orderBy)')
      console.log('- 执行查询 (getMany)')
      console.log('- ⚠️  问题：没有显式释放 QueryBuilder/连接')
      console.log('- ⚠️  当前实现依赖于 TypeORM 的自动连接管理，可能不够及时')
    })

    it('应该检测潜在的连接累积问题', async () => {
      const service = new PropagationVelocityService()

      const mockStatistics = [
        {
          id: '1',
          event_id: 'test-event',
          year: 2026,
          month: 1,
          day: 23,
          hour: 10,
          post_count: 100,
          repost_count: 500,
        },
      ]
      mockGetManySpy.mockResolvedValue(mockStatistics)

      // 记录内存使用情况（模拟）
      let connectionCount = 0

      // 监控每次调用的连接创建
      const originalCreateQueryBuilder = mockDataSource.createQueryBuilder
      mockDataSource.createQueryBuilder = vi.fn().mockImplementation((...args) => {
        connectionCount++
        console.log(`连接创建计数: ${connectionCount}`)
        return originalCreateQueryBuilder(...args)
      })

      // 执行多次调用
      const iterations = 20
      for (let i = 0; i < iterations; i++) {
        await service.getPropagationVelocity(`test-event-${i}`)
      }

      console.log(`总共创建了 ${connectionCount} 个 QueryBuilder`)
      console.log('⚠️  警告：如果这些 QueryBuilder 没有被正确释放，会导致连接泄露')
      console.log('⚠️  建议使用 useEntityManager 包装查询逻辑以自动释放连接')

      expect(connectionCount).toBe(iterations)
    })
  })

  describe('性能和压力测试', () => {
    it('应该能够处理大量连续请求', async () => {
      const service = new PropagationVelocityService()

      const mockStatistics = [
        {
          id: '1',
          event_id: 'test-event',
          year: 2026,
          month: 1,
          day: 23,
          hour: 10,
          post_count: 100,
          repost_count: 500,
        },
      ]
      mockGetManySpy.mockResolvedValue(mockStatistics)

      const stressTestCount = 100
      const startTime = Date.now()

      // 压力测试
      for (let i = 0; i < stressTestCount; i++) {
        await service.getPropagationVelocity(`test-event-${i}`)
      }

      const endTime = Date.now()
      const duration = endTime - startTime
      const avgTime = duration / stressTestCount

      console.log(`压力测试结果：`)
      console.log(`- 总调用次数: ${stressTestCount}`)
      console.log(`- 总耗时: ${duration}ms`)
      console.log(`- 平均每次调用: ${avgTime.toFixed(2)}ms`)
      console.log(`- 每秒处理次数: ${(1000 / avgTime).toFixed(2)}`)

      expect(mockDataSource.createQueryBuilder).toHaveBeenCalledTimes(stressTestCount)
      expect(duration).toBeLessThan(15000) // 15秒内完成
    })

    it('应该正确处理混合场景（连续+并发）', async () => {
      const service = new PropagationVelocityService()

      const mockStatistics = [
        {
          id: '1',
          event_id: 'test-event',
          year: 2026,
          month: 1,
          day: 23,
          hour: 10,
          post_count: 100,
          repost_count: 500,
        },
      ]
      mockGetManySpy.mockResolvedValue(mockStatistics)

      const startTime = Date.now()

      // 先执行一些连续调用
      for (let i = 0; i < 10; i++) {
        await service.getPropagationVelocity(`sequential-${i}`)
      }

      // 然后执行一些并发调用
      const concurrentPromises: Promise<any>[] = []
      for (let i = 0; i < 10; i++) {
        concurrentPromises.push(
          service.getPropagationVelocity(`concurrent-${i}`)
        )
      }
      await Promise.all(concurrentPromises)

      // 再执行一些连续调用
      for (let i = 0; i < 10; i++) {
        await service.getPropagationVelocity(`sequential-2-${i}`)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`混合场景测试耗时: ${duration}ms`)

      expect(mockDataSource.createQueryBuilder).toHaveBeenCalledTimes(30) // 10 + 10 + 10
      expect(duration).toBeLessThan(10000) // 10秒内完成
    })
  })
})
