import type { WorkflowScheduleEntity } from '@sker/entities'
import type { SortField, SortOrder } from './schedule-list-types'

/**
 * 调度列表 - 纯格式化工具函数
 *
 * 职责:将调度实体转换为可读的展示文本。
 */

/** 根据调度类型生成人类可读的描述 */
export function getScheduleDescription(schedule: WorkflowScheduleEntity): string {
  switch (schedule.scheduleType) {
    case 'cron':
      return schedule.cronExpression || ''
    case 'interval': {
      const seconds = schedule.intervalSeconds || 0
      if (seconds >= 86400) return `每 ${seconds / 86400} 天`
      if (seconds >= 3600) return `每 ${seconds / 3600} 小时`
      if (seconds >= 60) return `每 ${seconds / 60} 分钟`
      return `每 ${seconds} 秒`
    }
    case 'once':
      return '一次性执行'
    case 'continuous':
      return '执行完毕后立即重新执行'
    case 'manual':
      return '手动触发'
    default:
      return '未知类型'
  }
}

/** 格式化日期时间为 MM-DD HH:mm */
export function formatDateTime(date: string | Date): string {
  if (!date) return '-'
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

/**
 * 过滤并按指定字段排序调度列表。
 * searchQuery 为空时跳过过滤；排序使用 localeCompare / 时间戳。
 */
export function filterAndSortSchedules(
  schedules: WorkflowScheduleEntity[],
  searchQuery: string,
  sortField: SortField,
  sortOrder: SortOrder
): WorkflowScheduleEntity[] {
  let result = [...schedules]

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    result = result.filter(schedule =>
      schedule.name.toLowerCase().includes(query) ||
      getScheduleDescription(schedule).toLowerCase().includes(query)
    )
  }

  result.sort((a, b) => {
    let comparison = 0

    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'nextRunAt': {
        const aTime = a.nextRunAt ? new Date(a.nextRunAt).getTime() : 0
        const bTime = b.nextRunAt ? new Date(b.nextRunAt).getTime() : 0
        comparison = aTime - bTime
        break
      }
      case 'status':
        comparison = a.status.localeCompare(b.status)
        break
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  return result
}
