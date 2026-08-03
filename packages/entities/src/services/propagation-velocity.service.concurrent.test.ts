import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PropagationVelocityService } from './propagation-velocity.service'
import {
  useEntityManagerMock,
  mockStatistics,
  setupRepositoryMock,
} from './propagation-velocity.service.fixtures'

/**
 * PropagationVelocityService 并发与压力测试
 *
 * 覆盖：
 * - 并发调用不会导致连接泄露
 * - 高并发 / 大量连续请求 / 混合场景下的连接管理
 *
 * 通过 vi.mock('../utils') 将 useEntityManager 替换为 mock，
 * 完全不需要真实数据库即可运行。
 */

vi.mock('../utils', async () => {
  const actual = await vi.importActual<typeof import('../utils')>('../utils')
  return {
    ...actual,
    useEntityManager: vi.fn(),
  }
})

describe('PropagationVelocityService - 并发调用测试', () => {
  let mockGetManySpy: ReturnType<typeof vi.fn>
  let getRepositorySpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    const setup = setupRepositoryMock()
    mockGetManySpy = setup.mockGetManySpy
    getRepositorySpy = setup.getRepositorySpy
  })

  it('并发调用不应该导致连接泄露', async () => {
    const service = new PropagationVelocityService()

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

describe('PropagationVelocityService - 性能和压力测试', () => {
  let mockGetManySpy: ReturnType<typeof vi.fn>
  let getRepositorySpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    const setup = setupRepositoryMock()
    mockGetManySpy = setup.mockGetManySpy
    getRepositorySpy = setup.getRepositorySpy
  })

  it('应该能够处理大量连续请求', async () => {
    const service = new PropagationVelocityService()

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
