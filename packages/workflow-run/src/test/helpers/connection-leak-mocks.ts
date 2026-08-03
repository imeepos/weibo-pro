/**
 * 数据库连接泄露测试 Mock 工厂
 *
 * 说明：
 * - 该文件位于 src/test/ 目录下，被 tsconfig 排除（不参与类型检查），
 *   仅作为 vitest 测试辅助文件被测试用例导入使用。
 * - 每次调用 createMockDataSource 返回一组全新的 Mock 对象，
 *   与 tests/connection-leak.test.ts 原 beforeEach 中的构建逻辑一致。
 */
import { vi } from 'vitest'
import { DataSource, EntityManager } from 'typeorm'

/**
 * 创建模拟的 DataSource / EntityManager / QueryRunner
 */
export const createMockDataSource = () => {
  const queryRunnerReleaseSpy = vi.fn().mockResolvedValue(undefined)
  const queryRunnerMock = {
    connect: vi.fn().mockResolvedValue(undefined),
    startTransaction: vi.fn().mockResolvedValue(undefined),
    commitTransaction: vi.fn().mockResolvedValue(undefined),
    rollbackTransaction: vi.fn().mockResolvedValue(undefined),
    release: queryRunnerReleaseSpy,
    manager: null as any,
  }

  // 创建模拟的 EntityManager
  const mockEntityManager = {
    create: vi.fn().mockImplementation((entity, data) => ({ ...data, id: Date.now() })),
    save: vi.fn().mockResolvedValue(undefined),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    insert: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
    delete: vi.fn().mockResolvedValue({ affected: 1 }),
    getRepository: vi.fn().mockReturnThis(),
    query: vi.fn().mockResolvedValue([{ count: 5 }]),
  } as any

  queryRunnerMock.manager = mockEntityManager

  // 创建模拟的 DataSource
  const mockDataSource = {
    createEntityManager: vi.fn().mockReturnValue(mockEntityManager),
    createQueryRunner: vi.fn().mockReturnValue(queryRunnerMock),
    query: vi.fn().mockResolvedValue([{ count: 5 }]),
    isInitialized: true,
    initialize: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
  } as any

  return {
    mockDataSource: mockDataSource as DataSource,
    mockEntityManager: mockEntityManager as EntityManager,
    queryRunnerReleaseSpy,
  }
}
