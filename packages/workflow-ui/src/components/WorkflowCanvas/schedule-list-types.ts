import { Clock, CheckCircle, XCircle, Pause, Zap, Calendar } from 'lucide-react'

/**
 * 调度列表 - 类型与展示配置
 *
 * 职责:集中定义调度列表使用的类型、状态/类型展示配置与分页常量。
 */

export interface ScheduleListProps {
  workflowName: string
  className?: string
  onClose?: () => void
  apiBaseUrl?: string
}

export type ScheduleStatus = 'enabled' | 'disabled' | 'expired'
export type ScheduleType = 'cron' | 'interval' | 'once' | 'continuous' | 'manual'
export type SortField = 'name' | 'createdAt' | 'nextRunAt' | 'status'
export type SortOrder = 'asc' | 'desc'

export interface StatusConfig {
  label: string
  color: string
  icon: typeof CheckCircle
}

export interface TypeConfig {
  label: string
  color: string
  icon: typeof Calendar
}

export const STATUS_CONFIG: Record<ScheduleStatus, StatusConfig> = {
  enabled: {
    label: '启用中',
    color: 'text-[color:var(--node-success)]',
    icon: CheckCircle
  },
  disabled: {
    label: '已禁用',
    color: 'text-muted-foreground',
    icon: Pause
  },
  expired: {
    label: '已过期',
    color: 'text-destructive',
    icon: XCircle
  },
}

export const TYPE_CONFIG: Record<ScheduleType, TypeConfig> = {
  cron: {
    label: 'Cron',
    color: 'text-chart-2',
    icon: Clock
  },
  interval: {
    label: '间隔',
    color: 'text-chart-4',
    icon: Zap
  },
  once: {
    label: '一次性',
    color: 'text-chart-5',
    icon: Calendar
  },
  continuous: {
    label: '持续运行',
    color: 'text-chart-1',
    icon: Zap
  },
  manual: {
    label: '手动',
    color: 'text-muted-foreground',
    icon: Calendar
  },
}

export const ITEMS_PER_PAGE = 8
