import { ScheduleType } from '@sker/entities'
import { CronExpressionParser } from 'cron-parser'
import type { CreateScheduleDto } from './workflow-schedule.service'

/**
 * 将字符串或 Date 对象转换为 Date
 * 如果值无效，返回 undefined 而不是 Invalid Date
 */
export function toDate(value?: Date | string): Date | undefined {
  if (!value) return undefined
  if (typeof value === 'string') {
    // 空字符串视为无值
    if (value.trim() === '') return undefined
    const date = new Date(value)
    // 验证日期是否有效 - isNaN 检查可以捕获 Invalid Date
    if (isNaN(date.getTime())) {
      return undefined
    }
    return date
  }
  // 对于已经是 Date 对象的输入，也需要验证
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return undefined
    }
    return value
  }
  return undefined
}

/**
 * 验证调度参数
 */
export function validateSchedule(dto: CreateScheduleDto): void {
  switch (dto.scheduleType) {
    case ScheduleType.CRON:
      if (!dto.cronExpression) {
        throw new Error('Cron expression is required for cron schedule')
      }
      try {
        CronExpressionParser.parse(dto.cronExpression)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Invalid cron expression: ${errorMessage}`)
      }
      break
    case ScheduleType.INTERVAL:
      if (!dto.intervalSeconds || dto.intervalSeconds <= 0) {
        throw new Error('Interval seconds must be greater than 0')
      }
      break
    case ScheduleType.ONCE:
      if (!dto.startTime) {
        throw new Error('Start time is required for one-time schedule')
      }
      break
  }

  if (dto.endTime && dto.startTime && dto.endTime <= dto.startTime) {
    throw new Error('End time must be after start time')
  }
}

/**
 * 计算下次执行时间
 */
export function calculateNextRunTime(
  scheduleType: ScheduleType,
  params: {
    cronExpression?: string
    intervalSeconds?: number
    startTime?: Date
  }
): Date | null {
  const now = new Date()
  const startTime = params.startTime || now

  switch (scheduleType) {
    case ScheduleType.ONCE:
      return startTime > now ? startTime : now
    case ScheduleType.CRON:
      if (!params.cronExpression) {
        throw new Error('Cron expression required')
      }
      try {
        const interval = CronExpressionParser.parse(params.cronExpression)
        const next = interval.next()
        return next.toDate()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to calculate next run time: ${errorMessage}`)
      }
    case ScheduleType.INTERVAL:
      if (!params.intervalSeconds) {
        throw new Error('Interval seconds required')
      }
      return new Date(now.getTime() + params.intervalSeconds * 1000)
    case ScheduleType.CONTINUOUS:
      // 持续模式：执行完毕后立即重新执行，返回当前时间
      return new Date()
    case ScheduleType.MANUAL:
      // 手动触发不需要下次执行时间
      return null
    default:
      throw new Error(`Unsupported schedule type: ${scheduleType}`)
  }
}
