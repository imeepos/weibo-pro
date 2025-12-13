import React from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  AlertCircle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import type { WorkflowRunEntity, RunStatus } from '@sker/sdk'

interface WorkflowRunListProps {
  runs: WorkflowRunEntity[]
  total?: number
  page?: number
  pageSize?: number
  onViewDetail?: (run: WorkflowRunEntity) => void
  onCancel?: (run: WorkflowRunEntity) => void
  onPageChange?: (page: number) => void
}

const runStatusColors: Record<RunStatus, 'default' | 'secondary' | 'success' | 'destructive'> = {
  pending: 'default',
  running: 'secondary',
  success: 'success',
  failed: 'destructive',
  cancelled: 'default',
  timeout: 'destructive'
}

const runStatusLabels: Record<RunStatus, string> = {
  pending: '等待中',
  running: '执行中',
  success: '成功',
  failed: '失败',
  cancelled: '已取消',
  timeout: '超时'
}

const runStatusIcons: Record<RunStatus, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  running: Loader2,
  success: CheckCircle2,
  failed: XCircle,
  cancelled: Ban,
  timeout: AlertCircle
}

function formatDuration(ms?: number): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

export function WorkflowRunList({
  runs,
  total,
  page = 1,
  pageSize = 20,
  onViewDetail,
  onCancel,
  onPageChange
}: WorkflowRunListProps) {
  const totalPages = total ? Math.ceil(total / pageSize) : 1

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>运行ID</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>开始时间</TableHead>
            <TableHead>结束时间</TableHead>
            <TableHead>耗时</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground h-32">
                暂无执行记录
              </TableCell>
            </TableRow>
          ) : (
            runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-mono text-sm">
                  {run.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <Badge variant={runStatusColors[run.status]} className="inline-flex items-center gap-1">
                    {React.createElement(runStatusIcons[run.status], {
                      className: `w-3 h-3 ${run.status === 'running' ? 'animate-spin' : ''}`
                    })}
                    {runStatusLabels[run.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {run.startedAt
                    ? formatDistanceToNow(new Date(run.startedAt), {
                        addSuffix: true,
                        locale: zhCN
                      })
                    : '-'}
                </TableCell>
                <TableCell>
                  {run.completedAt
                    ? format(new Date(run.completedAt), 'yyyy-MM-dd HH:mm:ss')
                    : '-'}
                </TableCell>
                <TableCell>{formatDuration(run.durationMs)}</TableCell>
                <TableCell className="text-right space-x-2">
                  {onViewDetail && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewDetail(run)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      详情
                    </Button>
                  )}
                  {onCancel && (run.status === 'pending' || run.status === 'running') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCancel(run)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      取消
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {total && total > pageSize && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {total} 条记录，第 {page} / {totalPages} 页
          </div>
          <div className="space-x-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              上一页
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              下一页
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
