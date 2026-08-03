import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PropagationVelocityService } from './propagation-velocity.service'
import { EventHourlyStatisticsEntity } from '../event-hourly-statistics.entity'
import {
  useEntityManagerMock,
  mockStatistics,
  setupRepositoryMock,
} from './propagation-velocity.service.fixtures'

/**
 * PropagationVelocityService 查询执行测试
 *
 * 覆盖：
 * - 通过 useEntityManager 查询统计数据
 * - 查询参数透传
 * - 空结果 / 查询错误处理
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

describe('PropagationVelocityService - 查询执行测试', () => {
  let mockGetManySpy: ReturnType<typeof vi.fn>
  let getRepositorySpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    const setup = setupRepositoryMock()
    mockGetManySpy = setup.mockGetManySpy
    getRepositorySpy = setup.getRepositorySpy
  })

  it('应该通过 useEntityManager 查询统计数据', async () => {
    const service = new PropagationVelocityService()

    mockGetManySpy.mockResolvedValueOnce(mockStatistics)

    await service.getPropagationVelocity('test-event')

    // 验证 useEntityManager 被调用，并获取了对应实体的 Repository
    expect(useEntityManagerMock).toHaveBeenCalledTimes(1)
    expect(getRepositorySpy).toHaveBeenCalledWith(EventHourlyStatisticsEntity)
    expect(mockGetManySpy).toHaveBeenCalledTimes(1)
  })

  it('应该正确处理查询参数', async () => {
    const service = new PropagationVelocityService()

    mockGetManySpy.mockResolvedValueOnce(mockStatistics)

    const startTime = new Date('2026-01-23T10:00:00Z')
    const endTime = new Date('2026-01-23T12:00:00Z')

    await service.getPropagationVelocity('test-event', startTime, endTime)

    // 验证查询构建器被正确调用
    expect(useEntityManagerMock).toHaveBeenCalledTimes(1)
    expect(mockGetManySpy).toHaveBeenCalled()
  })
})

describe('PropagationVelocityService - 查询结果处理测试', () => {
  let mockGetManySpy: ReturnType<typeof vi.fn>
  let getRepositorySpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    const setup = setupRepositoryMock()
    mockGetManySpy = setup.mockGetManySpy
    getRepositorySpy = setup.getRepositorySpy
  })

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
