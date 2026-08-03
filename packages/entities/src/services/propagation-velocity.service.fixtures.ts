import { vi } from 'vitest'
import { useEntityManager } from '../utils'

/**
 * PropagationVelocityService 连接泄露测试的共享 fixtures
 *
 * - useEntityManagerMock：指向被 vi.mock 替换的 useEntityManager
 * - mockStatistics：测试中反复使用的模拟统计数据
 * - setupRepositoryMock：构造受控的 mock Repository / EntityManager
 *
 * 说明：各测试文件通过 vi.mock('../utils') 替换 useEntityManager，
 * 本文件仅提供数据与装配 helper，不触发任何真实数据库连接。
 */

export const useEntityManagerMock = useEntityManager as unknown as ReturnType<typeof vi.fn>

export const mockStatistics = [
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

export interface RepositoryMock {
  mockGetManySpy: ReturnType<typeof vi.fn>
  getRepositorySpy: ReturnType<typeof vi.fn>
}

/** 构造返回受控 mock Repository 的 useEntityManager 实现 */
export const setupRepositoryMock = (): RepositoryMock => {
  const mockGetManySpy = vi.fn()
  const getRepositorySpy = vi.fn()

  useEntityManagerMock.mockImplementation(async (handler: any) => {
    const repository = { find: mockGetManySpy }
    const manager = { getRepository: getRepositorySpy.mockReturnValue(repository) }
    return handler(manager)
  })

  return { mockGetManySpy, getRepositorySpy }
}
