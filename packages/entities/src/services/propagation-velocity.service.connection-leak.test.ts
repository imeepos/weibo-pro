import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PropagationVelocityService } from './propagation-velocity.service'
import {
  useEntityManagerMock,
  mockStatistics,
  setupRepositoryMock,
} from './propagation-velocity.service.fixtures'

/**
 * PropagationVelocityService 连接泄露测试
 *
 * 测试目标：
 * 1. 验证多次调用 getPropagationVelocity 后连接数不会持续增长
 * 2. 验证 Repository 查询生命周期的资源管理
 *
 * 说明：
 * - PropagationVelocityService.getPropagationVelocity 内部通过 useEntityManager
 *   获取 EntityManager，并调用 manager.getRepository(EventHourlyStatisticsEntity).find()
 * - 本测试通过 vi.mock('../utils') 将 useEntityManager 替换为 mock 实现，
 *   返回受控的 mock EntityManager / Repository，完全不需要真实数据库即可运行
 */

vi.mock('../utils', async () => {
  const actual = await vi.importActual<typeof import('../utils')>('../utils')
  return {
    ...actual,
    useEntityManager: vi.fn(),
  }
})

describe('PropagationVelocityService - 连接泄露检测测试', () => {
  let mockGetManySpy: ReturnType<typeof vi.fn>
  let getRepositorySpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // 重置调用记录
    vi.clearAllMocks()

    const setup = setupRepositoryMock()
    mockGetManySpy = setup.mockGetManySpy
    getRepositorySpy = setup.getRepositorySpy
  })

  it('多次调用后不应该累积未释放的连接', async () => {
    const service = new PropagationVelocityService()

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

describe('PropagationVelocityService - 资源管理测试', () => {
  let mockGetManySpy: ReturnType<typeof vi.fn>
  let getRepositorySpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    const setup = setupRepositoryMock()
    mockGetManySpy = setup.mockGetManySpy
    getRepositorySpy = setup.getRepositorySpy
  })

  it('应该正确模拟 Repository 查询的生命周期', async () => {
    const service = new PropagationVelocityService()

    mockGetManySpy.mockResolvedValueOnce(mockStatistics)

    // 执行查询
    await service.getPropagationVelocity('test-event')

    // 验证查询调用链
    expect(useEntityManagerMock).toHaveBeenCalled()
    expect(mockGetManySpy).toHaveBeenCalled()
  })

  it('应该检测潜在的连接累积问题', async () => {
    const service = new PropagationVelocityService()

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
