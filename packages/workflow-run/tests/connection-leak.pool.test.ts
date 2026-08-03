import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DataSource, EntityManager } from 'typeorm'
import { WorkflowRunLogEntity, NodeEventType } from '@sker/entities'
import { createMockDataSource } from '../src/test/helpers/connection-leak-mocks'

/**
 * 数据库连接泄露测试 - 连接池 / 事务 / 性能
 *
 * 从 tests/connection-leak.test.ts 按主题拆分的测试组：
 * - 连接池行为模拟：连接池限制与连接复用
 * - 数据一致性测试：事务回滚与提交
 * - 性能和效率测试：批量操作与连接复用
 */

describe('数据库连接泄露测试 - 连接池与事务', () => {
  let mockDataSource: DataSource
  let mockEntityManager: EntityManager
  let queryRunnerReleaseSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // 每个测试前重置 mock
    vi.clearAllMocks()

    // 创建一组全新的 Mock 对象
    const mocks = createMockDataSource()
    mockDataSource = mocks.mockDataSource
    mockEntityManager = mocks.mockEntityManager
    queryRunnerReleaseSpy = mocks.queryRunnerReleaseSpy
  })

  describe('连接池行为模拟', () => {
    it('应该正确模拟连接池限制', async () => {
      const maxPoolSize = 10
      let activeConnections = 0

      // 模拟获取连接
      const acquireConnection = async () => {
        if (activeConnections >= maxPoolSize) {
          throw new Error('Connection pool exhausted')
        }
        activeConnections++
        return activeConnections
      }

      // 模拟释放连接
      const releaseConnection = async () => {
        if (activeConnections > 0) {
          activeConnections--
        }
      }

      // 测试连接获取和释放
      const conn1 = await acquireConnection()
      expect(conn1).toBe(1)

      await releaseConnection()
      expect(activeConnections).toBe(0)

      // 测试连接池耗尽
      for (let i = 0; i < maxPoolSize; i++) {
        await acquireConnection()
      }

      await expect(acquireConnection()).rejects.toThrow('Connection pool exhausted')
    })

    it('应该正确处理连接复用', async () => {
      const connectionReuseCount = 5
      const reusedConnection = { id: 'conn-1', active: false }

      // 模拟连接复用
      const getConnection = async () => {
        if (!reusedConnection.active) {
          reusedConnection.active = true
          return reusedConnection
        }
        throw new Error('Connection already active')
      }

      const releaseConnection = async () => {
        reusedConnection.active = false
      }

      // 测试连接复用
      for (let i = 0; i < connectionReuseCount; i++) {
        const conn = await getConnection()
        expect(conn.id).toBe('conn-1')
        expect(conn.active).toBe(true)

        await releaseConnection()
        expect(conn.active).toBe(false)
      }

      // 验证只有一个连接被创建和复用
      expect(reusedConnection.id).toBe('conn-1')
    })
  })

  describe('数据一致性测试', () => {
    it('应该正确处理事务回滚', async () => {
      const rollbackSpy = vi.fn().mockResolvedValue(undefined)
      const queryRunner = {
        connect: vi.fn().mockResolvedValue(undefined),
        startTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: rollbackSpy,
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        release: vi.fn().mockResolvedValue(undefined),
        manager: mockEntityManager,
      }

      // 模拟事务失败
      try {
        await queryRunner.connect()
        await queryRunner.startTransaction()

        // 模拟操作失败
        throw new Error('Transaction failed')
      } catch (_error) {
        await queryRunner.rollbackTransaction()
      } finally {
        await queryRunner.release()
      }

      expect(queryRunner.startTransaction).toHaveBeenCalled()
      expect(rollbackSpy).toHaveBeenCalled()
      expect(queryRunner.release).toHaveBeenCalled()
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled()
    })

    it('应该正确处理事务提交', async () => {
      const commitSpy = vi.fn().mockResolvedValue(undefined)
      const queryRunner = {
        connect: vi.fn().mockResolvedValue(undefined),
        startTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
        commitTransaction: commitSpy,
        release: vi.fn().mockResolvedValue(undefined),
        manager: mockEntityManager,
      }

      // 模拟事务成功
      try {
        await queryRunner.connect()
        await queryRunner.startTransaction()

        // 模拟操作成功
        await queryRunner.manager.save(WorkflowRunLogEntity, {
          runId: Date.now(),
          nodeId: 'test-node',
          eventType: NodeEventType.SUCCESS
        })

        await queryRunner.commitTransaction()
      } catch (error) {
        await queryRunner.rollbackTransaction()
        throw error
      } finally {
        await queryRunner.release()
      }

      expect(queryRunner.startTransaction).toHaveBeenCalled()
      expect(commitSpy).toHaveBeenCalled()
      expect(queryRunner.release).toHaveBeenCalled()
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled()
    })
  })

  describe('性能和效率测试', () => {
    it('应该正确批量处理操作', async () => {
      const batchSize = 50
      const operations: Promise<any>[] = []

      const startTime = Date.now()

      // 批量执行操作
      for (let i = 0; i < batchSize; i++) {
        operations.push(
          (async () => {
            const manager = mockDataSource.createEntityManager()
            await manager.save(WorkflowRunLogEntity, {
              runId: Date.now() + i,
              nodeId: `batch-${i}`,
              eventType: NodeEventType.RUNNING
            })
          })()
        )
      }

      await Promise.all(operations)

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`批量操作 ${batchSize} 次耗时: ${duration}ms`)

      // 验证所有操作都完成
      expect(mockEntityManager.save).toHaveBeenCalledTimes(batchSize)

      // 性能检查：批量操作应该在合理时间内完成
      expect(duration).toBeLessThan(5000) // 5秒内完成
    })

    it('应该正确使用连接复用', async () => {
      const connectionReuseCount = 10
      const reusedConnection = { id: 'conn-1', active: false }

      // 模拟连接复用
      const getConnection = async () => {
        if (!reusedConnection.active) {
          reusedConnection.active = true
          return reusedConnection
        }
        throw new Error('Connection already active')
      }

      const releaseConnection = async () => {
        reusedConnection.active = false
      }

      // 测试连接复用
      for (let i = 0; i < connectionReuseCount; i++) {
        const conn = await getConnection()
        expect(conn.id).toBe('conn-1')
        expect(conn.active).toBe(true)

        await releaseConnection()
        expect(conn.active).toBe(false)
      }

      // 验证只有一个连接被创建和复用
      expect(reusedConnection.id).toBe('conn-1')
    })
  })
})
