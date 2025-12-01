'use client'

import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@sker/ui/lib/utils'
import { Badge } from '@sker/ui/components/ui/badge'
import { Button } from '@sker/ui/components/ui/button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@sker/ui/components/ui/collapsible'
import type { WorkflowNodeProps, WorkflowNodePort } from './types/workflow-nodes'

// 状态颜色映射
export const NODE_STATE_COLORS: Record<string, string> = {
  pending: 'hsl(var(--muted-foreground))',
  running: 'hsl(var(--node-running))',
  emitting: 'hsl(var(--node-emitting))',
  success: 'hsl(var(--node-success))',
  fail: 'hsl(var(--node-error))',
}

export const NODE_STATE_LABELS: Record<string, string> = {
  pending: '待执行',
  running: '执行中',
  emitting: '发送中',
  success: '成功',
  fail: '失败',
}

// 状态徽章
const StatusBadge = ({
  status,
  count,
}: {
  status?: string
  count: number
}) => {
  if (!status || status === 'pending') return null

  const getVariant = () => {
    switch (status) {
      case 'success':
        return 'default'
      case 'fail':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <Badge
      variant={getVariant()}
      className={cn(
        'absolute -top-2 -right-2 z-10',
        status === 'running' && 'animate-pulse',
        status === 'emitting' && 'animate-bounce'
      )}
      style={{
        backgroundColor: NODE_STATE_COLORS[status],
        borderColor: NODE_STATE_COLORS[status],
      }}
    >
      {NODE_STATE_LABELS[status]}({count})
    </Badge>
  )
}

// Handle 包装器
const HandleWrapper = ({
  port,
  type,
  isCollapsed,
}: {
  port?: WorkflowNodePort
  type: 'source' | 'target'
  isCollapsed?: boolean
}) => {
  if (!port) return null

  const isTarget = type === 'target'

  return (
    <Handle
      type={type}
      id={port.property}
      position={isTarget ? Position.Left : Position.Right}
      isConnectable={true}
      className={cn(
        '!w-3 !h-3 !border-2 rounded-full transition-all duration-150',
        'hover:!w-4 hover:!h-4 hover:shadow-lg',
        '!z-50 !cursor-crosshair',
        isTarget
          ? 'bg-[hsl(var(--workflow-handle-input))] border-[hsl(var(--workflow-handle-input-border))] hover:opacity-80'
          : 'bg-[hsl(var(--workflow-handle-output))] border-[hsl(var(--workflow-handle-output-border))] hover:opacity-80',
        isCollapsed && '!opacity-0 !pointer-events-none !w-0 !h-0'
      )}
    />
  )
}

// 端口行组件
const PortRow = ({
  input,
  output,
  isCollapsed,
}: {
  input?: WorkflowNodePort
  output?: WorkflowNodePort
  isCollapsed?: boolean
}) => (
  <div
    className={cn(
      'relative flex items-center justify-between h-6 px-2',
      isCollapsed && 'h-0 overflow-hidden opacity-0'
    )}
  >
    <div className="flex items-center gap-1 relative">
      {input && (
        <>
          <HandleWrapper port={input} type="target" isCollapsed={isCollapsed} />
          {!isCollapsed && (
            <>
              <span className="text-xs text-foreground/90 truncate ml-3">
                {input.label || input.property}
              </span>
              {input.isMulti && (
                <span className="text-[10px] text-muted-foreground font-mono">[]</span>
              )}
            </>
          )}
        </>
      )}
    </div>
    <div className="flex items-center gap-1 relative">
      {output && (
        <>
          {!isCollapsed && (
            <>
              {output.isMulti && (
                <span className="text-[10px] text-muted-foreground font-mono">[]</span>
              )}
              <span className="text-xs text-foreground/90 truncate mr-3">
                {output.label || output.property}
              </span>
            </>
          )}
          <HandleWrapper port={output} type="source" isCollapsed={isCollapsed} />
        </>
      )}
    </div>
  </div>
)

// 主组件
const WorkflowNodeComponent = ({
  id,
  type,
  label,
  description,
  color = '#3b82f6',
  icon,
  status,
  statusCount = 0,
  inputs = [],
  outputs = [],
  selected = false,
  collapsed = false,
  onToggleCollapse,
  children,
  onContextMenu,
  onDoubleClick,
  className,
}: WorkflowNodeProps) => {
  const getBorderColor = () => {
    if (selected) return 'hsl(var(--primary))'
    if (status) return NODE_STATE_COLORS[status] || NODE_STATE_COLORS.pending
    return 'hsl(var(--input))'
  }

  return (
    <Collapsible
      open={!collapsed}
      onOpenChange={(open) => onToggleCollapse?.()}
      asChild
    >
      <div
        className={cn(
          'flex flex-col rounded-2xl bg-background border border-input relative',
          'group shadow-xs rounded-[15px] hover:shadow-lg',
          'cursor-move select-none transition-all duration-200 max-h-[480px]',
          collapsed ? 'min-w-[180px]' : 'min-w-[240px]',
          className
        )}
        style={{
          borderColor: getBorderColor(),
          transition:
            'border-color 0.15s ease, box-shadow 0.15s ease, width 0.2s ease',
        }}
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
      >
        <StatusBadge status={status} count={statusCount} />

        {/* 节点头部 */}
        <div className="flex items-center rounded-t-2xl p-2">
          <div
            className="flex items-center justify-center w-6 h-6 rounded-lg mr-2 shrink-0 text-primary-foreground [&>svg]:size-4"
            style={{ backgroundColor: color }}
          >
            {icon || (
              <div className="w-3 h-3 bg-primary-foreground rounded-sm" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{label}</div>
            {description && !collapsed && (
              <div className="text-xs text-muted-foreground truncate mt-0.5">
                {description}
              </div>
            )}
          </div>
          {onToggleCollapse && (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-2"
                title={collapsed ? '展开节点' : '折叠节点'}
              >
                {collapsed ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronUp className="size-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>

        {/* 端口区域 */}
        <CollapsibleContent asChild>
          <div
            className={cn(
              'flex flex-col gap-1 relative border-t transition-all duration-200 py-2'
            )}
          >
            {Array.from({ length: Math.max(inputs.length, outputs.length) }).map(
              (_, index) => (
                <PortRow
                  key={`port-${index}`}
                  input={inputs[index]}
                  output={outputs[index]}
                  isCollapsed={collapsed}
                />
              )
            )}

            {/* 自定义内容 */}
            <div className="relative overflow-auto w-full h-full max-h-[380px] px-2">
              {children}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export const WorkflowNode = memo(WorkflowNodeComponent)
WorkflowNode.displayName = 'WorkflowNode'