/**
 * RunHistoryPanel 的常量与格式化工具
 */
import { RunStatus } from '@sker/sdk'
import type { FilterOption } from '@sker/ui/components/ui/filter-bar'

export const STATUS_FILTERS: FilterOption<RunStatus>[] = [
  { value: RunStatus.RUNNING, label: '运行中' },
  { value: RunStatus.SUCCESS, label: '成功' },
  { value: RunStatus.FAILED, label: '失败' },
  { value: RunStatus.CANCELLED, label: '已取消' },
]

export type StatusBadgeVariant = 'success' | 'error' | 'info' | 'pending' | 'cancelled' | 'warning'

export const STATUS_MAP: Record<RunStatus, { badge: StatusBadgeVariant, label: string }> = {
  [RunStatus.SUCCESS]: { badge: 'success', label: '成功' },
  [RunStatus.FAILED]: { badge: 'error', label: '失败' },
  [RunStatus.RUNNING]: { badge: 'info', label: '运行中' },
  [RunStatus.CANCELLED]: { badge: 'cancelled', label: '已取消' },
  [RunStatus.PENDING]: { badge: 'pending', label: '等待中' },
  [RunStatus.TIMEOUT]: { badge: 'warning', label: '超时' },
}

/**
 * 格式化日期（显示本地时区时间）
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date

  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * 格式化耗时
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }

  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

export function toStatusIconStatus(status: RunStatus): string {
  return status === RunStatus.TIMEOUT ? 'timeout' : status.toLowerCase()
}
