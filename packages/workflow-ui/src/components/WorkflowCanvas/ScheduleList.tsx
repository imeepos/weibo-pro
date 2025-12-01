'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Pause,
  Plus,
  X,
  Search,
  Calendar,
  Zap,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react'
import { WorkflowController } from '@sker/sdk'
import type { WorkflowScheduleEntity } from '@sker/entities'
import { root } from '@sker/core'
import { ScheduleDialog } from './ScheduleDialog'

/**
 * 调度列表
 *
 * 存在即合理:
 * - 展示工作流的调度计划
 * - 管理调度状态(启用/禁用)
 * - 删除和编辑调度
 * - 搜索和过滤调度
 * - 分页和排序
 *
 * 优雅设计:
 * - 2列网格卡片布局
 * - 搜索集成在头部
 * - 清晰的视觉层级
 * - 符合工作流整体风格
 */
export interface ScheduleListProps {
  workflowName: string
  className?: string
  onClose?: () => void
}

type ScheduleStatus = 'enabled' | 'disabled' | 'expired'
type ScheduleType = 'cron' | 'interval' | 'once' | 'manual'
type SortField = 'name' | 'createdAt' | 'nextRunAt' | 'status'
type SortOrder = 'asc' | 'desc'

interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: typeof CheckCircle
}

interface TypeConfig {
  label: string
  color: string
  bgColor: string
  icon: typeof Calendar
}

const STATUS_CONFIG: Record<ScheduleStatus, StatusConfig> = {
  enabled: {
    label: '启用中',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    icon: CheckCircle
  },
  disabled: {
    label: '已禁用',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    icon: Pause
  },
  expired: {
    label: '已过期',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    icon: XCircle
  },
}

const TYPE_CONFIG: Record<ScheduleType, TypeConfig> = {
  cron: {
    label: 'Cron',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    icon: Clock
  },
  interval: {
    label: '间隔',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    icon: Zap
  },
  once: {
    label: '一次性',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    icon: Calendar
  },
  manual: {
    label: '手动',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    icon: Calendar
  },
}

const ITEMS_PER_PAGE = 8

export function ScheduleList({ workflowName, className = '', onClose }: ScheduleListProps) {
  const client = root.get<WorkflowController>(WorkflowController) as any
  const [schedules, setSchedules] = useState<WorkflowScheduleEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editSchedule, setEditSchedule] = useState<WorkflowScheduleEntity | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const fetchSchedules = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await client.listSchedules(workflowName)
      setSchedules(data)
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || '获取调度列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()
  }, [workflowName])

  const handleToggleStatus = async (schedule: WorkflowScheduleEntity) => {
    try {
      if (schedule.status === 'enabled') {
        await client.disableSchedule(schedule.id)
      } else {
        await client.enableSchedule(schedule.id)
      }
      await fetchSchedules()
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || '更新调度状态失败')
    }
  }

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('确定要删除这个调度吗?此操作不可恢复。')) {
      return
    }

    try {
      await client.deleteSchedule(scheduleId)
      await fetchSchedules()
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || '删除调度失败')
    }
  }

  const handleEdit = (schedule: WorkflowScheduleEntity) => {
    setEditSchedule(schedule)
  }

  const getScheduleDescription = (schedule: WorkflowScheduleEntity): string => {
    switch (schedule.scheduleType) {
      case 'cron':
        return schedule.cronExpression || ''
      case 'interval':
        const seconds = schedule.intervalSeconds || 0
        if (seconds >= 86400) return `每 ${seconds / 86400} 天`
        if (seconds >= 3600) return `每 ${seconds / 3600} 小时`
        if (seconds >= 60) return `每 ${seconds / 60} 分钟`
        return `每 ${seconds} 秒`
      case 'once':
        return '一次性执行'
      case 'manual':
        return '手动触发'
      default:
        return '未知类型'
    }
  }

  const formatDateTime = (date: string | Date): string => {
    if (!date) return '-'
    const d = new Date(date)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}`
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // 搜索、排序和分页
  const filteredAndSortedSchedules = useMemo(() => {
    let result = [...schedules]

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(schedule =>
        schedule.name.toLowerCase().includes(query) ||
        getScheduleDescription(schedule).toLowerCase().includes(query)
      )
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'nextRunAt':
          const aTime = a.nextRunAt ? new Date(a.nextRunAt).getTime() : 0
          const bTime = b.nextRunAt ? new Date(b.nextRunAt).getTime() : 0
          comparison = aTime - bTime
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [schedules, searchQuery, sortField, sortOrder])

  // 分页
  const totalPages = Math.ceil(filteredAndSortedSchedules.length / ITEMS_PER_PAGE)
  const paginatedSchedules = filteredAndSortedSchedules.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // 重置页码当搜索或排序变化时
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortField, sortOrder])

  if (loading) {
    return (
      <div className={`rounded-2xl border border-[#2f3543] bg-[#111318] backdrop-blur-sm ${className}`}>
        <div className="flex items-center justify-center p-24">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#135bec] border-t-transparent"></div>
            <p className="text-sm text-[#6c7a91]">加载调度列表...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`rounded-2xl border border-[#2f3543] bg-[#111318] backdrop-blur-sm shadow-2xl ${className}`}>
        {/* Header */}
        <div className="border-b border-[#2f3543] px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f2531] text-[#135bec]">
                <Clock className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">调度管理</h3>
                <p className="text-sm text-[#6c7a91]">{filteredAndSortedSchedules.length} 个调度</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2 rounded-lg bg-[#135bec] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b6aff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#135bec]"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                新建
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-[#9da6b9] transition hover:bg-[#1f2531] hover:text-white"
                >
                  <X className="h-5 w-5" strokeWidth={1.8} />
                </button>
              )}
            </div>
          </div>

          {/* Search & Sort */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6c7a91]" strokeWidth={2} />
              <input
                type="text"
                placeholder="搜索调度..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#2f3543] bg-[#1a1d24] py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#6c7a91] focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSort('name')}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  sortField === 'name'
                    ? 'border-[#135bec] bg-[#135bec]/10 text-[#135bec]'
                    : 'border-[#2f3543] bg-[#1a1d24] text-[#9da6b9] hover:bg-[#1f2531]'
                }`}
              >
                名称
                {sortField === 'name' && (
                  <ArrowUpDown className="h-3 w-3" strokeWidth={2} />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSort('nextRunAt')}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  sortField === 'nextRunAt'
                    ? 'border-[#135bec] bg-[#135bec]/10 text-[#135bec]'
                    : 'border-[#2f3543] bg-[#1a1d24] text-[#9da6b9] hover:bg-[#1f2531]'
                }`}
              >
                时间
                {sortField === 'nextRunAt' && (
                  <ArrowUpDown className="h-3 w-3" strokeWidth={2} />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSort('status')}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  sortField === 'status'
                    ? 'border-[#135bec] bg-[#135bec]/10 text-[#135bec]'
                    : 'border-[#2f3543] bg-[#1a1d24] text-[#9da6b9] hover:bg-[#1f2531]'
                }`}
              >
                状态
                {sortField === 'status' && (
                  <ArrowUpDown className="h-3 w-3" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-100">{error}</p>
            </div>
          )}

          {paginatedSchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1f2531]">
                <Clock className="h-8 w-8 text-[#6c7a91]" strokeWidth={1.5} />
              </div>
              <p className="text-base font-medium text-white">
                {searchQuery ? '未找到匹配的调度' : '暂无调度计划'}
              </p>
              <p className="mt-2 text-sm text-[#6c7a91]">
                {searchQuery ? '尝试使用其他关键词搜索' : '点击"新建"按钮创建第一个调度任务'}
              </p>
            </div>
          ) : (
            <>
              {/* 2-column Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {paginatedSchedules.map((schedule) => {
                  const statusConfig = STATUS_CONFIG[schedule.status as ScheduleStatus]
                  const typeConfig = TYPE_CONFIG[schedule.scheduleType as ScheduleType]
                  const StatusIcon = statusConfig.icon
                  const TypeIcon = typeConfig.icon

                  return (
                    <div
                      key={schedule.id}
                      className="group rounded-xl border border-[#2f3543] bg-[#1a1d24] p-4 transition hover:border-[#3f4653] hover:bg-[#1f2531]"
                    >
                      {/* Header: Name & Status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate mb-2">{schedule.name}</h4>
                          <div className="flex items-center gap-2">
                            <div className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${statusConfig.color} ${statusConfig.bgColor}`}>
                              <StatusIcon className="h-3 w-3" strokeWidth={2.5} />
                              {statusConfig.label}
                            </div>
                            <div className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${typeConfig.color} ${typeConfig.bgColor}`}>
                              <TypeIcon className="h-3 w-3" strokeWidth={2} />
                              {typeConfig.label}
                            </div>
                          </div>
                        </div>

                        {/* Toggle Switch */}
                        <label className="relative inline-flex cursor-pointer items-center ml-2">
                          <input
                            type="checkbox"
                            checked={schedule.status === 'enabled'}
                            onChange={() => handleToggleStatus(schedule)}
                            disabled={schedule.status === 'expired'}
                            className="peer sr-only"
                          />
                          <div className="peer h-5 w-9 rounded-full bg-[#2f3543] after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#135bec] peer-checked:after:translate-x-full peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                        </label>
                      </div>

                      {/* Description */}
                      <div className="mb-3">
                        <p className="text-xs text-[#9da6b9] truncate">{getScheduleDescription(schedule)}</p>
                      </div>

                      {/* Time Info */}
                      <div className="space-y-1 mb-3">
                        {schedule.nextRunAt && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#6c7a91]">下次执行</span>
                            <span className="text-[#9da6b9] font-medium">{formatDateTime(schedule.nextRunAt)}</span>
                          </div>
                        )}
                        {schedule.lastRunAt && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#6c7a91]">上次执行</span>
                            <span className="text-[#9da6b9]">{formatDateTime(schedule.lastRunAt)}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-[#2f3543]">
                        <button
                          type="button"
                          onClick={() => handleEdit(schedule)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#1f2531] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#282e39]"
                        >
                          <Edit2 className="h-3 w-3" strokeWidth={2} />
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(schedule.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#1f2531] px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-[#282e39]"
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={2} />
                          删除
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#6c7a91]">
                    显示 {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedSchedules.length)} 项，共 {filteredAndSortedSchedules.length} 项
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2f3543] bg-[#1a1d24] text-[#9da6b9] transition hover:bg-[#1f2531] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition ${
                            currentPage === page
                              ? 'bg-[#135bec] text-white'
                              : 'border border-[#2f3543] bg-[#1a1d24] text-[#9da6b9] hover:bg-[#1f2531]'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2f3543] bg-[#1a1d24] text-[#9da6b9] transition hover:bg-[#1f2531] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {editSchedule && (
        <ScheduleDialog
          workflowName={workflowName}
          schedule={editSchedule}
          open={!!editSchedule}
          onOpenChange={(open) => !open && setEditSchedule(null)}
          onSuccess={fetchSchedules}
        />
      )}

      {showCreateDialog && (
        <ScheduleDialog
          workflowName={workflowName}
          open={showCreateDialog}
          onOpenChange={(open) => setShowCreateDialog(open)}
          onSuccess={fetchSchedules}
        />
      )}
    </>
  )
}
