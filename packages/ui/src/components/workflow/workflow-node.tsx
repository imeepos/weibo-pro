'use client'

import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import {
  Clock,
  Play,
  TrendingUp,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { cn } from '@sker/ui/lib/utils'
import type { WorkflowNodeProps, WorkflowNodePort } from './types/workflow-nodes'
import type { IAstStates } from '@sker/workflow'

// 状态颜色映射（从 workflow-ui 迁移）
export const NODE_STATE_COLORS: Record<IAstStates, string> = {
  pending: '#94a3b8',
  running: '#3b82f6',
  emitting: '#a855f7',
  success: '#22c55e',
  fail: '#ef4444',
}

export const NODE_STATE_LABELS: Record<IAstStates, string> = {
  pending: '待执行',
  running: '执行中',
  emitting: '发送中',
  success: '成功',
  fail: '失败',
}

// 状态图标组件
const StateIcon = ({ state }: { state: IAstStates }) => {
  const iconProps = {
    size: 12,
    strokeWidth: 2,
    className: 'shrink-0',
  }

  switch (state) {
    case 'pending':
      return <Clock {...iconProps} />
    case 'running':
      return <Play {...iconProps} fill="currentColor" />
    case 'emitting':
      return <TrendingUp {...iconProps} />
    case 'success':
      return <Check {...iconProps} />
    case 'fail':
      return <X {...iconProps} />
  }
}

// 状态徽章组件
const StatusBadge = ({
  status,
  count,
}: {
  status?: IAstStates
  count: number
}) => {
  if (!status || status === 'pending') return null

  const stateColor = NODE_STATE_COLORS[status]
  const stateLabel = NODE_STATE_LABELS[status]

  const getAnimationClass = () => {
    if (status === 'running') return 'animate-pulse'
    if (status === 'emitting') return 'animate-bounce'
    return ''
  }

  return (
    <div
      className={cn(
        'absolute -top-2 -right-2 z-10',
        'flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-[10px] font-medium text-white shadow-lg',
        getAnimationClass()
      )}
      style={{ backgroundColor: stateColor }}
      title={stateLabel}
    >
      <StateIcon state={status} />
      <span>
        {stateLabel}({count})
      </span>
    </div>
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
          ? '!bg-blue-500 !border-blue-300 hover:!bg-blue-400'
          : '!bg-green-500 !border-green-300 hover:!bg-green-400',
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
              <span className="text-xs text-slate-200 truncate ml-2">
                {input.label || input.property}
              </span>
              {input.isMulti && (
                <span className="text-[10px] text-slate-400 font-mono">[]</span>
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
                <span className="text-[10px] text-slate-400 font-mono">[]</span>
              )}
              <span className="text-xs text-slate-200 truncate mr-2">
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
    if (selected) return '#818cf6'
    if (status) return NODE_STATE_COLORS[status] || NODE_STATE_COLORS.pending
    return 'transparent'
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border-[2px] relative',
        'group pb-1 shadow-xs rounded-[15px] bg-workflow-block-bg hover:shadow-lg',
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
      <div className="flex items-center rounded-t-2xl px-3 py-4 border-b">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-lg mr-2 shrink-0"
          style={{ backgroundColor: color }}
        >
          <div className="w-3 h-3 bg-white rounded-sm"></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{label}</div>
          {description && !collapsed && (
            <div className="text-xs text-slate-400 truncate mt-0.5">
              {description}
            </div>
          )}
        </div>
        {onToggleCollapse && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse()
            }}
            className="ml-2 shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            title={collapsed ? '展开节点' : '折叠节点'}
          >
            {collapsed ? (
              <ChevronDown size={14} className="text-white" />
            ) : (
              <ChevronUp size={14} className="text-white" />
            )}
          </button>
        )}
      </div>

      {/* 端口区域 */}
      <div
        className={cn(
          'flex flex-col gap-1 relative transition-all duration-200',
          collapsed ? 'mt-0' : 'mt-2'
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
        <div className="relative overflow-auto w-full h-full max-h-[380px]">
          {!collapsed && children}
        </div>
      </div>
    </div>
  )
}

export const WorkflowNode = memo(WorkflowNodeComponent)
WorkflowNode.displayName = 'WorkflowNode'
