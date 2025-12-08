'use client'

import React from 'react'
import { Clock, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { StatusBadge } from '@sker/ui/components/ui/status-badge'
import { cn } from '@sker/ui/lib/utils'
import { useExecutionStore } from '../../store/execution.store'

interface NodeRunHistoryProps {
  nodeId: string
}

type StatusConfig = { badge: 'success' | 'error' | 'info' | 'pending', label: string, icon: typeof CheckCircle2 }

const STATUS_CONFIG: Record<string, StatusConfig> = {
  success: { badge: 'success', label: '成功', icon: CheckCircle2 },
  fail: { badge: 'error', label: '失败', icon: XCircle },
  running: { badge: 'info', label: '运行中', icon: Loader2 },
  pending: { badge: 'pending', label: '等待中', icon: Clock },
  emitting: { badge: 'info', label: '发射中', icon: Loader2 },
}

const DEFAULT_CONFIG: StatusConfig = { badge: 'pending', label: '等待中', icon: Clock }
const EMPTY_RECORDS: never[] = []

function getStatusConfig(status: string): StatusConfig {
  return STATUS_CONFIG[status] || DEFAULT_CONFIG
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function NodeRunHistory({ nodeId }: NodeRunHistoryProps) {
  const records = useExecutionStore((state) => state.nodeHistory[nodeId] ?? EMPTY_RECORDS)

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-sm font-medium text-muted-foreground">暂无执行记录</p>
        <p className="text-xs text-muted-foreground/70 mt-2">运行节点后将显示执行历史</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {records.map((record) => {
        const config = getStatusConfig(record.status)
        const Icon = config.icon
        return (
          <div
            key={record.id}
            className="rounded-lg border border-border bg-secondary/50 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={cn(
                  "h-4 w-4",
                  record.status === 'running' && "animate-spin",
                  record.status === 'success' && "text-green-500",
                  record.status === 'fail' && "text-destructive",
                )} />
                <StatusBadge status={config.badge}>{config.label}</StatusBadge>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(record.startedAt)}
              </span>
            </div>
            {record.error && (
              <p className="mt-2 text-xs text-destructive truncate">
                {record.error.message}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
