'use client'

import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@sker/ui/lib/utils'
import { Badge } from '@sker/ui/components/ui/badge'
import { Button } from '@sker/ui/components/ui/button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@sker/ui/components/ui/collapsible'
import { NODE_STATE_COLORS, NODE_STATE_LABELS } from '../../constants/workflow'
import type { WorkflowNodeProps, WorkflowNodePort } from './types/workflow-nodes'

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

// 获取数组长度
const getArrayLength = (value: any): number | null => {
  if (Array.isArray(value)) {
    return value.length
  }
  return null
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
        'absolute -top-4 -left-2 z-10',
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

// Handle 包装器 - 折叠时独立渲染
const HandleWrapper = ({
  port,
  type,
  isCollapsed,
  portIndex,
  totalPorts,
}: {
  port?: WorkflowNodePort
  type: 'source' | 'target'
  isCollapsed?: boolean
  portIndex?: number
  totalPorts?: number
}) => {
  if (!port) return null

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
const PortRow = ({
  input,
  output,
  isCollapsed
}: {
  input?: WorkflowNodePort
  output?: WorkflowNodePort,
  isCollapsed?: boolean
}) => {
  // 检查输入端口的聚合模式
  const inputIsMulti = input && (hasMultiMode(input.mode) || input.isMulti)
  const inputIsBuffer = input && hasBufferMode(input.mode)
  const inputCount = input && getArrayLength(input.value)

  // 检查输出端口的聚合模式
  const outputIsMulti = output && (hasMultiMode(output.mode) || output.isMulti)
  const outputIsBuffer = output && hasBufferMode(output.mode)
  const outputCount = output && getArrayLength(output.value)

  return (
    <div className="relative flex items-center justify-between h-6 px-2">
      <div className="flex items-center gap-1 relative">
        {input && (
          <>
            <HandleWrapper port={input} type="target" isCollapsed={isCollapsed} />
            <span className="text-xs text-foreground/90 truncate ml-3">
              {input.label || input.property}
            </span>
            {(inputIsMulti || inputIsBuffer) && (
              <span className="text-[10px] text-muted-foreground font-mono">
                [{inputCount !== null ? inputCount : ''}]
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
            {(outputIsMulti || outputIsBuffer) && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {outputIsBuffer && outputIsMulti && <span className="mr-0.5" title="缓冲+聚合">⚡</span>}
                {outputIsBuffer && !outputIsMulti && <span className="mr-0.5" title="缓冲">⏱</span>}
                [{outputCount !== null ? outputCount : ''}]
              </span>
            )}
            <span className="text-xs text-foreground/90 truncate mr-3">
              {output.label || output.property}
            </span>
            <HandleWrapper port={output} type="source" isCollapsed={isCollapsed} />
          </>
        )}
      </div>
    </div>
  )
}

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
                variant="secondary"
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

        {/* 折叠状态下的 Handles - 始终渲染以保持边的连线 */}
        {collapsed && (
          <>
            {inputs.map((input, index) => (
              <HandleWrapper
                key={`collapsed-input-${input.property}`}
                port={input}
                type="target"
                isCollapsed={true}
                portIndex={index}
                totalPorts={inputs.length}
              />
            ))}
            {outputs.map((output, index) => (
              <HandleWrapper
                key={`collapsed-output-${output.property}`}
                port={output}
                type="source"
                isCollapsed={true}
                portIndex={index}
                totalPorts={outputs.length}
              />
            ))}
          </>
        )}

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