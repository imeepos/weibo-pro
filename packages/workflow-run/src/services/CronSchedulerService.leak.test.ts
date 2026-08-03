import { describe, it, expect, vi, afterEach } from 'vitest'
import { CronSchedulerService } from './CronSchedulerService'
import { WorkflowExecutionService } from './WorkflowExecutionService'
import { createMockExecutionService, createMockRedis } from '../test/helpers/cron-scheduler-mocks'

// Mock useEntityManager：避免在单元测试中触发真实 TypeORM 连接
vi.mock('@sker/entities', async () => {
  const actual = await vi.importActual('@sker/entities')
  return {
    ...actual,
    useEntityManager: vi.fn().mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => {
      const mockManager = {
        find: vi.fn().mockResolvedValue([]),
        findOne: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ affected: 1 }),
        transaction: vi.fn().mockImplementation(async (c: (m: unknown) => Promise<unknown>) => await c(mockManager)),
      }
      return await cb(mockManager)
    }),
  }
})

/**
 * 泄漏背景（2026-08-03 审计实证）：
 * startWatching() 通过 redis.subscribe() 新建一条专用 Redis 连接，
 * 返回的取消函数（unsubscribe+quit）被丢弃；stop() 只置 stopped=true 不退订。
 * → 每次启停泄漏一条 Redis 连接 + message 监听器。
 */
describe('CronSchedulerService.startWatching 退订泄漏修复', () => {
  let service: CronSchedulerService
  let mockExecutionService: WorkflowExecutionService

  afterEach(async () => {
    if (service) await service.stopAll()
    vi.clearAllMocks()
  })

  it('watcher.stop() 应调用 Redis 订阅取消函数（退订并释放连接）', async () => {
    const mockRedis = createMockRedis()
    mockExecutionService = createMockExecutionService()
    service = new CronSchedulerService(mockExecutionService, mockRedis)

    const watcher = await service.startWatching()

    // 取出 redis.subscribe 返回的取消函数
    const subscribeMock = mockRedis.subscribe as unknown as ReturnType<typeof vi.fn>
    const cancelFn = subscribeMock.mock.results[0]?.value as ReturnType<typeof vi.fn> | undefined
    expect(cancelFn).toBeDefined()

    await watcher.stop()

    expect(cancelFn).toHaveBeenCalledTimes(1)
  })
})
