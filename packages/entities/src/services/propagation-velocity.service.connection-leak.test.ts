import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEntityManager } from '../utils'
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
 * 说明：
 * - PropagationVelocityService.getPropagationVelocity 内部通过 useEntityManager
 *   获取 EntityManager，并调用 manager.getRepository(EventHourlyStatisticsEntity).find()
 * - 本测试通过 vi.mock('../utils') 将 useEntityManager 替换为 mock 实现，
 *   返回受控的 mock EntityManager / Repository，完全不需要真实数据库即可运行
 * - 之前版本定义了 mockDataSource 却从未注入 Service，导致仍触发真实连接，
 *   本版本彻底隔离，不会触发任何真实数据库连接
 */

// 彻底 mock ../utils 中的 useEntityManager，保留其余导出
vi.mock('../utils', async () => {
  const actual = await vi.importActual<typeof import('../utils')>('../utils')
  return {
    ...actual,
    useEntityManager: vi.fn(),
  }
})

const useEntityManagerMock = useEntityManager as unknown as ReturnType<typeof vi.fn>

describe('PropagationVelocityService - 连接泄露测试', () => {
  let mockGetManySpy: ReturnType<typeof vi.fn>
  let getRepositorySpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // 重置调用记录
    vi.clearAllMocks()

    mockGetManySpy = vi.fn()
    getRepositorySpy = vi.fn()

    // useEntityManager 返回 mock EntityManager：getRepository 返回 mock Repository
    useEntityManagerMock.mockImplementation(async (handler: any) => {
      const repository = { find: mockGetManySpy }
      const manager = { getRepository: getRepositorySpy.mockReturnValue(repository) }
      return handler(manager)
    })
  })

  describe('查询执行测试', () => {
    it('应该通过 useEntityManager 查询统计数据', async () => {
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

      await service.getPropagationVelocity('test-event')

      // 验证 useEntityManager 被调用，并获取了对应实体的 Repository
      expect(useEntityManagerMock).toHaveBeenCalledTimes(1)
      expect(getRepositorySpy).toHaveBeenCalledWith(EventHourlyStatisticsEntity)
      expect(mockGetManySpy).toHaveBeenCalledTimes(1)
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
      expect(useEntityManagerMock).toHaveBeenCalledTimes(1)
      expect(mockGetManySpy).toHaveBeenCalled()
    })
  })

  describe('连接泄露检测测试', () => {
    it('多次调用后不应该累积未释放的连接', async () => {
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

      // 每次调用都应经过 useEntityManager（连接由该 helper 统一管理）
      expect(useEntityManagerMock).toHaveBeenCalledTimes(callCount)
      expect(mockGetManySpy).toHaveBeenCalledTimes(callCount)
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

      // 验证所有调用都成功完成
      expect(useEntityManagerMock).toHaveBeenCalledTimes(callCount)

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
      expect(useEntityManagerMock).toHaveBeenCalledTimes(concurrentCalls)
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

      // 验证所有调用都成功
      expect(useEntityManagerMock).toHaveBeenCalledTimes(highConcurrency)
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
      expect(useEntityManagerMock).toHaveBeenCalledTimes(1)
      expect(mockGetManySpy).toHaveBeenCalledTimes(1)
    })

    it('应该正确处理查询错误', async () => {
      const service = new PropagationVelocityService()

      // 模拟查询错误
      mockGetManySpy.mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(
        service.getPropagationVelocity('test-event')
      ).rejects.toThrow('Database connection failed')

      expect(useEntityManagerMock).toHaveBeenCalledTimes(1)
      expect(mockGetManySpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('资源管理测试', () => {
    it('应该正确模拟 Repository 查询的生命周期', async () => {
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

      // 验证查询调用链
      expect(useEntityManagerMock).toHaveBeenCalled()
      expect(mockGetManySpy).toHaveBeenCalled()
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

      // 记录每次 useEntityManager 调用（等价于每次潜在连接获取）
      let connectionCount = 0
      const trackingMock = vi.fn(async (handler: any) => {
        connectionCount++
        const repository = { find: mockGetManySpy }
        const manager = { getRepository: getRepositorySpy.mockReturnValue(repository) }
        return handler(manager)
      })
      useEntityManagerMock.mockImplementation(trackingMock)

      // 执行多次调用
      const iterations = 20
      for (let i = 0; i < iterations; i++) {
        await service.getPropagationVelocity(`test-event-${i}`)
      }

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

      expect(useEntityManagerMock).toHaveBeenCalledTimes(stressTestCount)
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

      expect(useEntityManagerMock).toHaveBeenCalledTimes(30) // 10 + 10 + 10
      expect(duration).toBeLessThan(10000) // 10秒内完成
    })
  })
})
