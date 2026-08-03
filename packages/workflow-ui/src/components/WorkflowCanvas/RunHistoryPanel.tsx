'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Clock,
  Eye,
  StopCircle,
  Calendar,
} from 'lucide-react'
import { type WorkflowRunEntity, RunStatus } from '@sker/sdk'
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
} from '@sker/ui/components/ui/filter-bar'
import {
  Spinner,
} from '@sker/ui/components/ui/spinner'
import { Button } from '@sker/ui/components/ui/button'
import { useRunHistory } from './useRunHistory'
import { RunDetailDialog } from './RunDetailDialog'
import {
  STATUS_FILTERS,
  STATUS_MAP,
  formatDate,
  formatDuration,
  toStatusIconStatus,
} from './run-history-utils'

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

export function RunHistoryPanel({
  visible,
  workflowId,
  onClose,
  onViewDetail,
  scheduleId,
}: RunHistoryPanelProps) {
  const {
    runs,
    total,
    page,
    pageSize,
    setPage,
    loading,
    statusFilter,
    setStatusFilter,
    selectedRun,
    setSelectedRun,
    handleViewDetail,
    handleCancelRun,
  } = useRunHistory({ visible, workflowId, scheduleId, onViewDetail })

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
            onChange={(value) => setStatusFilter(value as RunStatus | undefined)}
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
                          <StatusIcon status={toStatusIconStatus(run.status) as any} />
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

    </>
  )

  return typeof document !== 'undefined'
    ? (
      <>
        {createPortal(dialogContent, document.body)}
        {selectedRun && (
          <RunDetailDialog
            run={selectedRun}
            onClose={() => setSelectedRun(null)}
          />
        )}
      </>
    )
    : null
}
