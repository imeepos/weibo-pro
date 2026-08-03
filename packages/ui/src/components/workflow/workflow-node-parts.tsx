import React from 'react'
import { Handle, Position } from '@xyflow/react'

import { cn } from '@sker/ui/lib/utils'
import { Badge } from '@sker/ui/components/ui/badge'
import { NODE_STATE_COLORS, NODE_STATE_LABELS } from '../../constants/workflow'
import type { INodeInputMetadata, INodeOutputMetadata } from '@sker/workflow'

// 聚合模式位标志
const IS_MULTI = 0x000001
const IS_BUFFER = 0x000010

// 位标志检查函数
const hasMultiMode = (mode?: number): boolean => {
  return ((mode ?? 0) & IS_MULTI) === IS_MULTI
}

const hasBufferMode = (mode?: number): boolean => {
  return ((mode ?? 0) & IS_BUFFER) === IS_BUFFER
}

// 状态徽章
export const StatusBadge = ({
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
        'absolute -top-4 -left-2 z-10',
        status === 'running' && 'animate-pulse',
        status === 'emitting' && 'animate-bounce'
      )}
      style={{
        backgroundColor: NODE_STATE_COLORS[status],
        borderColor: NODE_STATE_COLORS[status],
      }}
    >
      {NODE_STATE_LABELS[status]}&nbsp;{count}
    </Badge>
  )
}

// Handle 包装器 - 折叠时独立渲染
export const HandleWrapper = ({
  port,
  type,
  isCollapsed,
  portIndex,
  totalPorts,
  disableHandles,
}: {
  port?: INodeInputMetadata
  type: 'source' | 'target'
  isCollapsed?: boolean
  portIndex?: number
  totalPorts?: number
  disableHandles?: boolean
}) => {
  if (!port || disableHandles) return null

  const isTarget = type === 'target'

  // 在折叠状态下，计算 Handle 的垂直位置（均匀分布）
  const style: React.CSSProperties = {}
  if (isCollapsed && portIndex !== undefined && totalPorts !== undefined && totalPorts > 0) {
    // 计算垂直位置百分比，使 Handles 均匀分布
    const spacing = 100 / (totalPorts + 1)
    const top = `${spacing * (portIndex + 1)}%`
    style.top = top
  }

  return (
    <Handle
      type={type}
      id={port.property}
      position={isTarget ? Position.Left : Position.Right}
      isConnectable={true}
      style={style}
      className={cn(
        '!w-3 !h-3 !border-2 rounded-full transition-all duration-150',
        'hover:!w-4 hover:!h-4 hover:shadow-lg',
        '!z-50 !cursor-crosshair',
        isTarget
          ? 'bg-[hsl(var(--workflow-handle-input))] border-[hsl(var(--workflow-handle-input-border))] hover:opacity-80'
          : 'bg-[hsl(var(--workflow-handle-output))] border-[hsl(var(--workflow-handle-output-border))] hover:opacity-80'
      )}
    />
  )
}

// 端口行组件 - 不再包含 Handle
export const PortRow = ({
  input,
  output,
  isCollapsed,
  disableHandles
}: {
  input?: INodeInputMetadata
  output?: INodeOutputMetadata,
  isCollapsed?: boolean
  disableHandles?: boolean
}) => {
  // 检查输入端口的聚合模式
  const inputIsMulti = input && hasMultiMode(input.mode)
  const inputIsBuffer = input && hasBufferMode(input.mode)

  return (
    <div className="relative flex items-center justify-between h-6 px-2">
      <div className="flex items-center gap-1 relative">
        {input && (
          <>
            <HandleWrapper port={input} type="target" isCollapsed={isCollapsed} disableHandles={disableHandles} />
            <span className="text-xs text-[hsl(var(--workflow-port-input-text))] font-medium truncate ml-3">
              {input.title || input.property}
            </span>
            {(inputIsMulti || inputIsBuffer) && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {inputIsBuffer && inputIsMulti && <span className="ml-0.5" title="缓冲+聚合">⚡</span>}
                {inputIsBuffer && !inputIsMulti && <span className="ml-0.5" title="缓冲">⏱</span>}
              </span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-1 relative">
        {output && (
          <>
            <span className="text-xs text-[hsl(var(--workflow-port-output-text))] font-medium truncate mr-3">
              {output.title || output.property}
            </span>
            <HandleWrapper port={output as INodeInputMetadata} type="source" isCollapsed={isCollapsed} disableHandles={disableHandles} />
          </>
        )}
      </div>
    </div>
  )
}
