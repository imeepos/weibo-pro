/**
 * CronSchedulerService 测试辅助
 *
 * 说明：
 * - 该文件位于 src/test/ 目录下，被 tsconfig 排除（不参与类型检查），
 *   仅作为 vitest 测试辅助文件被测试用例导入使用。
 * - 提供调度/Redis/执行服务的工厂函数。
 * - 注意：useEntityManager 的 mock 注册（vi.mock）与共享 mock 状态容器
 *   必须放在各测试文件内（vi.hoisted 变量无法从本文件导出）。
 */
import { vi } from 'vitest'
import { RedisClient } from '@sker/redis'
import { WorkflowExecutionService } from '../../services/WorkflowExecutionService'
import {
  WorkflowScheduleEntity,
  ScheduleStatus,
  ScheduleType,
} from '@sker/entities'

/**
 * 创建调度实体
 */
export const createSchedule = (
  overrides: Partial<WorkflowScheduleEntity> = {}
): WorkflowScheduleEntity => ({
  id: 'test-schedule',
  name: '测试调度',
  workflowId: 'workflow-1',
  scheduleType: ScheduleType.CRON,
  cronExpression: '* * * * * *',
  status: ScheduleStatus.ENABLED,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

/**
 * 创建 Mock 执行服务
 */
export const createMockExecutionService = (): WorkflowExecutionService => ({
  execute: vi.fn()
} as any)

/**
 * 创建 Mock Redis
 */
export const createMockRedis = (): RedisClient => ({
  setnx: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(true),
  del: vi.fn().mockResolvedValue(1),
  subscribe: vi.fn().mockImplementation((_channel: string, _callback: (ch: string, msg: string) => void) => {
    // 返回取消订阅函数
    return vi.fn().mockImplementation(() => {
      // 清理逻辑
    })
  }),
  publish: vi.fn().mockResolvedValue(1)
} as any)
