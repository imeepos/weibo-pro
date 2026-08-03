/**
 * 工作流调度工具：计算下次执行时间。
 */
import { logger } from '@sker/core'
import { WorkflowScheduleEntity, ScheduleType } from '@sker/entities'
import { CronExpressionParser } from 'cron-parser'

/**
 * 计算下次执行时间。
 * - 已过期 / ONCE / MANUAL：返回 null
 * - CRON：使用 cron-parser 解析表达式
 * - INTERVAL：当前时间 + 间隔秒数
 * - CONTINUOUS：立即执行（返回当前时间）
 */
export function calculateNextRunTime(schedule: WorkflowScheduleEntity): Date | null {
  const now = new Date()

  // 如果已过期
  if (schedule.endTime && now >= schedule.endTime) {
    return null
  }

  switch (schedule.scheduleType) {
    case ScheduleType.ONCE:
      // 一次性任务执行后不再执行
      return null

    case ScheduleType.CRON:
      if (!schedule.cronExpression) {
        logger.error('Cron 调度缺少表达式', { scheduleId: schedule.id })
        return null
      }
      try {
        // 使用 cron-parser 解析 cron 表达式并计算下次执行时间
        const expression = CronExpressionParser.parse(schedule.cronExpression, {
          currentDate: now,
          tz: 'UTC'
        })
        return expression.next().toDate()
      } catch (error) {
        logger.error('Cron 表达式解析失败', {
          scheduleId: schedule.id,
          expression: schedule.cronExpression,
          error: (error as Error).message
        })
        return null
      }

    case ScheduleType.INTERVAL:
      if (!schedule.intervalSeconds) {
        logger.error('间隔调度缺少间隔时间', { scheduleId: schedule.id })
        return null
      }
      return new Date(now.getTime() + schedule.intervalSeconds * 1000)

    case ScheduleType.CONTINUOUS:
      // 持续模式：执行完毕后立即重新执行
      // 返回当前时间作为下次执行时间（表示立即执行）
      return now

    case ScheduleType.MANUAL:
      // 手动触发不需要下次执行时间
      return null

    default:
      logger.error('不支持的调度类型', {
        scheduleId: schedule.id,
        scheduleType: schedule.scheduleType
      })
      return null
  }
}
