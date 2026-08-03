'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { type WorkflowRunEntity, RunStatus } from '@sker/sdk'
import { StatusBadge } from '@sker/ui/components/ui/status-badge'
import { StatusIcon } from '@sker/ui/components/ui/status-icon'
import { Button } from '@sker/ui/components/ui/button'
import { STATUS_MAP, formatDate, formatDuration, toStatusIconStatus } from './run-history-utils'

/**
 * 运行详情对话框
 */
export interface RunDetailDialogProps {
  run: WorkflowRunEntity
  onClose: () => void
}

export function RunDetailDialog({ run, onClose }: RunDetailDialogProps) {
  const statusConfig = STATUS_MAP[run.status]

  const dialogContent = (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        style={{ zIndex: 10000 }}
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 w-full max-w-3xl max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col"
        style={{ zIndex: 10001 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <StatusIcon status={toStatusIconStatus(run.status) as any} />
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
