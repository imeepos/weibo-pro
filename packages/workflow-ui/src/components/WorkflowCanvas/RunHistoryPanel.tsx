'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Clock,
  Eye,
  StopCircle,
  Calendar,
} from 'lucide-react'
import { type WorkflowRunEntity, RunStatus } from '@sker/sdk'
import { root } from '@sker/core'
import { WorkflowController } from '@sker/sdk'
import {
  StatusBadge
} from '@sker/ui/components/ui/status-badge'
import { StatusIcon } from '@sker/ui/components/ui/status-icon'
import {
  EmptyState,
} from '@sker/ui/components/ui/empty-state'
import {
  SimplePagination,
} from '@sker/ui/components/ui/simple-pagination'
import {
  FilterBar,
  type FilterOption,
} from '@sker/ui/components/ui/filter-bar'
import {
  Spinner,
} from '@sker/ui/components/ui/spinner'
import { Button } from '@sker/ui/components/ui/button'
import { cn } from '@sker/ui/lib/utils'

/**
 * 运行历史面板
 */
export interface RunHistoryPanelProps {
  visible: boolean
  workflowId: string
  onClose: () => void
  onViewDetail?: (run: WorkflowRunEntity) => void
  scheduleId?: string
}

const STATUS_FILTERS: FilterOption<RunStatus>[] = [
  { value: RunStatus.RUNNING, label: '运行中' },
  { value: RunStatus.SUCCESS, label: '成功' },
  { value: RunStatus.FAILED, label: '失败' },
  { value: RunStatus.CANCELLED, label: '已取消' },
]

const STATUS_MAP: Record<RunStatus, { badge: 'success' | 'error' | 'info' | 'pending' | 'cancelled' | 'warning', label: string }> = {
  [RunStatus.SUCCESS]: { badge: 'success', label: '成功' },
  [RunStatus.FAILED]: { badge: 'error', label: '失败' },
  [RunStatus.RUNNING]: { badge: 'info', label: '运行中' },
  [RunStatus.CANCELLED]: { badge: 'cancelled', label: '已取消' },
  [RunStatus.PENDING]: { badge: 'pending', label: '等待中' },
  [RunStatus.TIMEOUT]: { badge: 'warning', label: '超时' },
}

export function RunHistoryPanel({
  visible,
  workflowId,
  onClose,
  onViewDetail,
  scheduleId,
}: RunHistoryPanelProps) {
  const [runs, setRuns] = useState<WorkflowRunEntity[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<RunStatus | undefined>()
  const [selectedRun, setSelectedRun] = useState<WorkflowRunEntity | null>(null)

  useEffect(() => {
    if (visible) {
      loadRuns()
    }
  }, [visible, page, statusFilter, workflowId, scheduleId])

  const loadRuns = async () => {
    setLoading(true)
    try {
      const controller = root.get<WorkflowController>(WorkflowController)
      const result = await controller.listRuns({
        workflowId,
        page,
        pageSize,
        status: statusFilter,
        scheduleId,
      })

      setRuns(result.runs)
      setTotal(result.total)
    } catch (error) {
      console.error('加载运行历史失败', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = async (runId: string) => {
    try {
      const controller = root.get<WorkflowController>(WorkflowController)
      const run = await controller.getRun(runId)

      setSelectedRun(run)
      onViewDetail?.(run)
    } catch (error) {
      console.error('加载运行详情失败', error)
    }
  }

  const handleCancelRun = async (runId: string) => {
    try {
      const controller = root.get<WorkflowController>(WorkflowController)
      await controller.cancelRun({ runId })
      loadRuns()
    } catch (error) {
      console.error('取消运行失败', error)
    }
  }

  if (!visible) return null

  const totalPages = Math.ceil(total / pageSize)

  const dialogContent = (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-[9999] w-full max-w-5xl max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Clock className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {scheduleId ? `调度 #${scheduleId} 的运行历史` : '运行历史'}
              </h3>
              <p className="text-sm text-muted-foreground/70">共 {total} 条记录</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        {/* Filters */}
        <div className="border-b border-border p-4">
          <FilterBar
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : runs.length === 0 ? (
            <EmptyState
              icon={Clock}
              description="暂无运行记录"
            />
          ) : (
            <div className="space-y-3">
              {runs.map((run) => {
                const statusConfig = STATUS_MAP[run.status]
                return (
                  <div
                    key={run.id}
                    className="rounded-lg border border-border bg-secondary p-4 transition hover:border-border"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                          <StatusIcon status={run.status === RunStatus.TIMEOUT ? 'timeout' : run.status.toLowerCase() as any} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              运行 #{run.id}
                            </span>
                            <StatusBadge status={statusConfig.badge}>
                              {statusConfig.label}
                            </StatusBadge>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground/70">
                            <span>{formatDate(run.createdAt)}</span>
                            {run.durationMs && (
                              <span>耗时 {formatDuration(run.durationMs)}</span>
                            )}
                            {run.scheduleId && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                调度 #{run.scheduleId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(run.id)}
                          className="gap-2"
                        >
                          <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                          查看详情
                        </Button>

                        {run.status === RunStatus.RUNNING && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelRun(run.id)}
                            className="gap-2"
                          >
                            <StopCircle className="h-3.5 w-3.5" strokeWidth={2} />
                            取消
                          </Button>
                        )}
                      </div>
                    </div>

                    {run.error && (
                      <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                        <p className="text-xs text-destructive">{run.error.message}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-border p-6">
            <SimplePagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Run Detail Dialog */}
      {selectedRun && (
        <RunDetailDialog
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </>
  )

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : null
}

/**
 * 运行详情对话框
 */
interface RunDetailDialogProps {
  run: WorkflowRunEntity
  onClose: () => void
}

function RunDetailDialog({ run, onClose }: RunDetailDialogProps) {
  const statusConfig = STATUS_MAP[run.status]

  const dialogContent = (
    <>
      <div
        className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-[10001] w-full max-w-3xl max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <StatusIcon status={run.status === RunStatus.TIMEOUT ? 'timeout' : run.status.toLowerCase() as any} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                运行详情 #{run.id}
              </h3>
              <p className="text-sm text-muted-foreground/70">
                {formatDate(run.createdAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Status */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              状态
            </label>
            <StatusBadge status={statusConfig.badge}>
              {statusConfig.label}
            </StatusBadge>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                开始时间
              </label>
              <p className="text-sm text-foreground">
                {run.startedAt ? formatDate(run.startedAt) : '-'}
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                完成时间
              </label>
              <p className="text-sm text-foreground">
                {run.completedAt ? formatDate(run.completedAt) : '-'}
              </p>
            </div>
          </div>

          {/* Duration */}
          {run.durationMs && (
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                执行耗时
              </label>
              <p className="text-sm text-foreground">{formatDuration(run.durationMs)}</p>
            </div>
          )}

          {/* Inputs */}
          {run.inputs && Object.keys(run.inputs).length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                输入参数
              </label>
              <pre className="rounded-lg border border-border bg-secondary p-3 text-xs text-foreground overflow-x-auto">
                {JSON.stringify(run.inputs, null, 2)}
              </pre>
            </div>
          )}

          {/* Outputs */}
          {run.outputs && Object.keys(run.outputs).length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                输出结果
              </label>
              <pre className="rounded-lg border border-border bg-secondary p-3 text-xs text-foreground overflow-x-auto">
                {JSON.stringify(run.outputs, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {run.error && (
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                错误信息
              </label>
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                <p className="text-sm text-destructive mb-2">{run.error.message}</p>
                {run.error.stack && (
                  <pre className="text-xs text-destructive/80 overflow-x-auto">
                    {run.error.stack}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border p-6">
          <Button
            variant="outline"
            onClick={onClose}
          >
            关闭
          </Button>
        </div>
      </div>
    </>
  )

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : null
}

/**
 * 格式化日期（显示本地时区时间）
 */
function formatDate(date: Date | string): string {
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
function formatDuration(ms: number): string {
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
