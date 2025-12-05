'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Plus,
  X,
  Zap,
  Calendar,
  ArrowUpDown
} from 'lucide-react'
import { toast } from 'sonner'
import { WorkflowController } from '@sker/sdk'
import type { WorkflowScheduleEntity } from '@sker/entities'
import { root } from '@sker/core'
import { ScheduleDialog } from './ScheduleDialog'
import { RunConfigDialog } from './RunConfigDialog'
import { Button } from '@sker/ui/components/ui/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@sker/ui/components/ui/empty'
import { Card } from '@sker/ui/components/ui/card'
import { ScheduleCard } from '@sker/ui/components/ui/schedule-card'
import { SearchInput } from '@sker/ui/components/ui/search-input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@sker/ui/components/ui/alert-dialog'
import { WorkflowGraphAst, fromJson } from '@sker/workflow'

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
 * - 使用 @sker/ui 组件实现统一的设计语言
 * - 清晰的视觉层级
 * - 符合工作流整体风格
 */
export interface ScheduleListProps {
  workflowName: string
  className?: string
  onClose?: () => void
  apiBaseUrl?: string
}

type ScheduleStatus = 'enabled' | 'disabled' | 'expired'
type ScheduleType = 'cron' | 'interval' | 'once' | 'manual'
type SortField = 'name' | 'createdAt' | 'nextRunAt' | 'status'
type SortOrder = 'asc' | 'desc'

interface StatusConfig {
  label: string
  color: string
  icon: typeof CheckCircle
}

interface TypeConfig {
  label: string
  color: string
  icon: typeof Calendar
}

const STATUS_CONFIG: Record<ScheduleStatus, StatusConfig> = {
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

const TYPE_CONFIG: Record<ScheduleType, TypeConfig> = {
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
  manual: {
    label: '手动',
    color: 'text-muted-foreground',
    icon: Calendar
  },
}

const ITEMS_PER_PAGE = 8

export function ScheduleList({ workflowName, className = '', onClose, apiBaseUrl }: ScheduleListProps) {
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
  const [triggeringIds, setTriggeringIds] = useState<Set<string>>(new Set())
  const [triggerDialogSchedule, setTriggerDialogSchedule] = useState<WorkflowScheduleEntity | null>(null)
  const [workflowAst, setWorkflowAst] = useState<WorkflowGraphAst | null>(null)
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null)

  // 自动获取 API 基础 URL（如果未提供）
  const effectiveApiBaseUrl = apiBaseUrl || (
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : ''
  )

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

  const handleDelete = (scheduleId: string) => {
    setDeleteScheduleId(scheduleId)
  }

  const confirmDelete = async () => {
    if (!deleteScheduleId) return

    try {
      await client.deleteSchedule(deleteScheduleId)
      await fetchSchedules()
      toast.success('调度已删除')
    } catch (err: unknown) {
      const error = err as Error
      const errorMsg = error.message || '删除调度失败'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setDeleteScheduleId(null)
    }
  }

  const handleTrigger = async (schedule: WorkflowScheduleEntity) => {
    try {
      setError('')
      // 获取工作流 AST
      const workflow = await client.getWorkflow({ name: workflowName })
      if (!workflow) {
        throw new Error('工作流不存在')
      }

      // 反序列化工作流 AST
      const ast = fromJson<WorkflowGraphAst>(workflow)

      // 设置工作流 AST 和调度信息
      setWorkflowAst(ast)
      setTriggerDialogSchedule(schedule)
    } catch (err: unknown) {
      const error = err as Error
      const errorMsg = error.message || '获取工作流失败'
      setError(errorMsg)
      toast.error('打开配置失败', {
        description: errorMsg
      })
    }
  }

  const handleConfirmTrigger = async (inputs: Record<string, unknown>) => {
    if (!triggerDialogSchedule) return

    setTriggeringIds(prev => new Set(prev).add(triggerDialogSchedule.id))

    try {
      setError('')
      const result = await client.triggerSchedule(triggerDialogSchedule.id, { inputs })

      if (result.success) {
        toast.success('调度已触发', {
          description: `运行ID: ${result.runId}`
        })
      }
    } catch (err: unknown) {
      const error = err as Error
      const errorMsg = error.message || '触发调度失败'
      setError(errorMsg)
      toast.error('触发失败', {
        description: errorMsg
      })
    } finally {
      setTriggeringIds(prev => {
        const next = new Set(prev)
        next.delete(triggerDialogSchedule.id)
        return next
      })
      // 关闭对话框
      setTriggerDialogSchedule(null)
      setWorkflowAst(null)
    }
  }

  const handleCancelTrigger = () => {
    setTriggerDialogSchedule(null)
    setWorkflowAst(null)
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

  const filteredAndSortedSchedules = useMemo(() => {
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

  const totalPages = Math.ceil(filteredAndSortedSchedules.length / ITEMS_PER_PAGE)
  const paginatedSchedules = filteredAndSortedSchedules.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortField, sortOrder])

  if (loading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center p-24">
          <div className="flex flex-col items-center gap-4">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-muted-foreground text-sm">加载调度列表...</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <div className="border-border border-b px-6 py-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-secondary text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                <Clock className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">调度管理</h3>
                <p className="text-muted-foreground text-sm">{filteredAndSortedSchedules.length} 个调度</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4" strokeWidth={2} />
                新建
              </Button>
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" strokeWidth={1.8} />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <SearchInput
                placeholder="搜索调度..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={sortField === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('name')}
              >
                名称
                {sortField === 'name' && (
                  <ArrowUpDown className="ml-1 h-3 w-3" strokeWidth={2} />
                )}
              </Button>
              <Button
                variant={sortField === 'nextRunAt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('nextRunAt')}
              >
                时间
                {sortField === 'nextRunAt' && (
                  <ArrowUpDown className="ml-1 h-3 w-3" strokeWidth={2} />
                )}
              </Button>
              <Button
                variant={sortField === 'status' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('status')}
              >
                状态
                {sortField === 'status' && (
                  <ArrowUpDown className="ml-1 h-3 w-3" strokeWidth={2} />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="border-destructive/30 bg-destructive/10 mb-4 rounded-lg border p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {paginatedSchedules.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Clock className="text-muted-foreground h-8 w-8" strokeWidth={1.5} />
                </EmptyMedia>
                <EmptyTitle>
                  {searchQuery ? '未找到匹配的调度' : '暂无调度计划'}
                </EmptyTitle>
                <EmptyDescription>
                  {searchQuery ? '尝试使用其他关键词搜索' : '点击"新建"按钮创建第一个调度任务'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-4">
                {paginatedSchedules.map((schedule) => {
                  const statusConfig = STATUS_CONFIG[schedule.status as ScheduleStatus]
                  const typeConfig = TYPE_CONFIG[schedule.scheduleType as ScheduleType]

                  return (
                    <ScheduleCard
                      key={schedule.id}
                      name={schedule.name}
                      description={getScheduleDescription(schedule)}
                      status={statusConfig}
                      type={typeConfig}
                      enabled={schedule.status === 'enabled'}
                      expired={schedule.status === 'expired'}
                      nextRunAt={schedule.nextRunAt ? formatDateTime(schedule.nextRunAt) : undefined}
                      lastRunAt={schedule.lastRunAt ? formatDateTime(schedule.lastRunAt) : undefined}
                      isManual={schedule.scheduleType === 'manual'}
                      scheduleId={schedule.id}
                      apiBaseUrl={effectiveApiBaseUrl}
                      triggering={triggeringIds.has(schedule.id)}
                      onToggle={() => handleToggleStatus(schedule)}
                      onEdit={() => handleEdit(schedule)}
                      onDelete={() => handleDelete(schedule.id)}
                      onTrigger={() => handleTrigger(schedule)}
                    />
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-xs">
                    显示 {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedSchedules.length)} 项，共 {filteredAndSortedSchedules.length} 项
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      &lt;
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="icon-sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      &gt;
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

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

      {triggerDialogSchedule && workflowAst && (
        <RunConfigDialog
          visible={true}
          workflow={workflowAst}
          defaultInputs={triggerDialogSchedule.inputs || {}}
          onConfirm={handleConfirmTrigger}
          onCancel={handleCancelTrigger}
        />
      )}

      <AlertDialog open={!!deleteScheduleId} onOpenChange={(open) => !open && setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个调度吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
