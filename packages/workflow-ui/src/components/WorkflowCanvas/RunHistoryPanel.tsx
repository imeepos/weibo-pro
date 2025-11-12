'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Play,
  StopCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { type WorkflowRunEntity, RunStatus } from '@sker/entities'
import { root } from '@sker/core'
import { WorkflowController } from '@sker/sdk'

/**
 * 运行历史面板
 *
 * 存在即合理：
 * - 展示工作流的所有运行历史
 * - 支持查看运行详情
 * - 支持分页和筛选
 * - 支持取消正在运行的实例
 *
 * 优雅设计：
 * - 响应式布局
 * - 实时状态更新
 * - 清晰的状态标识
 * - 优雅的错误处理
 */
export interface RunHistoryPanelProps {
  visible: boolean
  workflowId: number
  onClose: () => void
  onViewDetail?: (run: WorkflowRunEntity) => void
}

export function RunHistoryPanel({
  visible,
  workflowId,
  onClose,
  onViewDetail,
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
  }, [visible, page, statusFilter, workflowId])

  const loadRuns = async () => {
    setLoading(true)
    try {
      const controller = root.get<WorkflowController>(WorkflowController)
      const result = await controller.listRuns({
        workflowId,
        page,
        pageSize,
        status: statusFilter,
      })

      setRuns(result.runs)
      setTotal(result.total)
    } catch (error) {
      console.error('加载运行历史失败', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = async (runId: number) => {
    try {
      const controller = root.get<WorkflowController>(WorkflowController)
      const run = await controller.getRun({ runId })

      setSelectedRun(run)
      onViewDetail?.(run)
    } catch (error) {
      console.error('加载运行详情失败', error)
    }
  }

  const handleCancelRun = async (runId: number) => {
    try {
      const controller = root.get<WorkflowController>(WorkflowController)
      await controller.cancelRun({ runId })

      // 刷新列表
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
      <div className="fixed left-1/2 top-1/2 z-[9999] w-full max-w-5xl max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#2f3543] bg-[#111318] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2f3543] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f2531] text-[#135bec]">
              <Clock className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">运行历史</h3>
              <p className="text-sm text-[#6c7a91]">共 {total} 条记录</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9da6b9] transition hover:bg-[#1f2531] hover:text-white"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        {/* Filters */}
        <div className="border-b border-[#2f3543] p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#9da6b9]">状态：</span>
            <button
              type="button"
              onClick={() => setStatusFilter(undefined)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${statusFilter === undefined
                  ? 'bg-[#135bec] text-white'
                  : 'bg-[#1a1d24] text-[#9da6b9] hover:bg-[#1f2531]'
                }`}
            >
              全部
            </button>
            {[
              { value: RunStatus.RUNNING, label: '运行中' },
              { value: RunStatus.SUCCESS, label: '成功' },
              { value: RunStatus.FAILED, label: '失败' },
              { value: RunStatus.CANCELLED, label: '已取消' },
            ].map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => setStatusFilter(status.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${statusFilter === status.value
                    ? 'bg-[#135bec] text-white'
                    : 'bg-[#1a1d24] text-[#9da6b9] hover:bg-[#1f2531]'
                  }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-[#135bec]" />
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1f2531] text-[#6c7a91]">
                <Clock className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-[#6c7a91]">暂无运行记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="rounded-lg border border-[#2f3543] bg-[#1a1d24] p-4 transition hover:border-[#3f4553]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1f2531]">
                        {getStatusIcon(run.status)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            运行 #{run.id}
                          </span>
                          {getStatusBadge(run.status)}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-[#6c7a91]">
                          <span>
                            {formatDate(run.createdAt)}
                          </span>
                          {run.durationMs && (
                            <span>耗时 {formatDuration(run.durationMs)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewDetail(run.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#2f3543] bg-[#1a1d24] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#1f2531]"
                      >
                        <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                        查看详情
                      </button>

                      {run.status === RunStatus.RUNNING && (
                        <button
                          type="button"
                          onClick={() => handleCancelRun(run.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
                        >
                          <StopCircle className="h-3.5 w-3.5" strokeWidth={2} />
                          取消
                        </button>
                      )}
                    </div>
                  </div>

                  {run.error && (
                    <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                      <p className="text-xs text-red-400">{run.error.message}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#2f3543] p-6">
            <p className="text-sm text-[#6c7a91]">
              第 {page} 页，共 {totalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-[#2f3543] bg-[#1a1d24] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#1f2531] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                上一页
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-[#2f3543] bg-[#1a1d24] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#1f2531] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
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
  const dialogContent = (
    <>
      <div
        className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-[10001] w-full max-w-3xl max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#2f3543] bg-[#111318] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2f3543] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f2531]">
              {getStatusIcon(run.status)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                运行详情 #{run.id}
              </h3>
              <p className="text-sm text-[#6c7a91]">
                {formatDate(run.createdAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9da6b9] transition hover:bg-[#1f2531] hover:text-white"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Status */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#9da6b9]">
              状态
            </label>
            {getStatusBadge(run.status)}
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#9da6b9]">
                开始时间
              </label>
              <p className="text-sm text-white">
                {run.startedAt ? formatDate(run.startedAt) : '-'}
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#9da6b9]">
                完成时间
              </label>
              <p className="text-sm text-white">
                {run.completedAt ? formatDate(run.completedAt) : '-'}
              </p>
            </div>
          </div>

          {/* Duration */}
          {run.durationMs && (
            <div>
              <label className="mb-2 block text-sm font-medium text-[#9da6b9]">
                执行耗时
              </label>
              <p className="text-sm text-white">{formatDuration(run.durationMs)}</p>
            </div>
          )}

          {/* Inputs */}
          {run.inputs && Object.keys(run.inputs).length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-[#9da6b9]">
                输入参数
              </label>
              <pre className="rounded-lg border border-[#2f3543] bg-[#1a1d24] p-3 text-xs text-white overflow-x-auto">
                {JSON.stringify(run.inputs, null, 2)}
              </pre>
            </div>
          )}

          {/* Outputs */}
          {run.outputs && Object.keys(run.outputs).length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-[#9da6b9]">
                输出结果
              </label>
              <pre className="rounded-lg border border-[#2f3543] bg-[#1a1d24] p-3 text-xs text-white overflow-x-auto">
                {JSON.stringify(run.outputs, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {run.error && (
            <div>
              <label className="mb-2 block text-sm font-medium text-[#9da6b9]">
                错误信息
              </label>
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm text-red-400 mb-2">{run.error.message}</p>
                {run.error.stack && (
                  <pre className="text-xs text-red-300 overflow-x-auto">
                    {run.error.stack}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-[#2f3543] p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#2f3543] bg-[#1a1d24] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2531]"
          >
            关闭
          </button>
        </div>
      </div>
    </>
  )

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : null
}

/**
 * 获取状态图标
 */
function getStatusIcon(status: RunStatus) {
  switch (status) {
    case RunStatus.SUCCESS:
      return <CheckCircle2 className="h-5 w-5 text-green-400" strokeWidth={2} />
    case RunStatus.FAILED:
      return <XCircle className="h-5 w-5 text-red-400" strokeWidth={2} />
    case RunStatus.RUNNING:
      return <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" strokeWidth={2} />
    case RunStatus.CANCELLED:
      return <StopCircle className="h-5 w-5 text-orange-400" strokeWidth={2} />
    case RunStatus.PENDING:
      return <Clock className="h-5 w-5 text-gray-400" strokeWidth={2} />
    case RunStatus.TIMEOUT:
      return <AlertCircle className="h-5 w-5 text-yellow-400" strokeWidth={2} />
    default:
      return <AlertCircle className="h-5 w-5 text-gray-400" strokeWidth={2} />
  }
}

/**
 * 获取状态徽章
 */
function getStatusBadge(status: RunStatus) {
  const configs: Record<
    RunStatus,
    { label: string; className: string }
  > = {
    [RunStatus.SUCCESS]: {
      label: '成功',
      className: 'bg-green-500/10 text-green-400 border-green-500/20',
    },
    [RunStatus.FAILED]: {
      label: '失败',
      className: 'bg-red-500/10 text-red-400 border-red-500/20',
    },
    [RunStatus.RUNNING]: {
      label: '运行中',
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    [RunStatus.CANCELLED]: {
      label: '已取消',
      className: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    },
    [RunStatus.PENDING]: {
      label: '等待中',
      className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    },
    [RunStatus.TIMEOUT]: {
      label: '超时',
      className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    },
  }

  const config = configs[status] || {
    label: status,
    className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}

/**
 * 格式化日期
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
