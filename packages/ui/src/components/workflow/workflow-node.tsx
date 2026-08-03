import React, { memo } from 'react'
import { ChevronDown, ChevronUp, Play, Square, Copy, Trash2, Info } from 'lucide-react'

import { cn } from '@sker/ui/lib/utils'
import { Button } from '@sker/ui/components/ui/button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@sker/ui/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipTrigger } from '@sker/ui/components/ui/tooltip'
import { NODE_STATE_COLORS } from '../../constants/workflow'
import type { INodeInputMetadata } from '@sker/workflow'
import type { WorkflowNodeProps } from './types/workflow-nodes'

import { HandleWrapper, PortRow, StatusBadge } from './workflow-node-parts.js'

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
  isEntryNode = false,
  isEndNode = false,
  children,
  onContextMenu,
  onDoubleClick,
  onDuplicate,
  onDelete,
  onShowInfo,
  className,
  disableHandles = false,
}: WorkflowNodeProps) => {
  const getBorderColor = () => {
    if (selected) return 'hsl(var(--primary))'
    if (status) return NODE_STATE_COLORS[status] || NODE_STATE_COLORS.pending
    return 'hsl(var(--input))'
  }

  return (
    <Collapsible
      open={!collapsed}
      onOpenChange={(_open) => onToggleCollapse?.()}
      key={id}
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
        {/* 起始节点标记 */}
        {isEntryNode && (
          <div
            className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-md z-10 flex items-center justify-center"
            title="起始节点"
          >
            <Play className="w-2 h-2 text-white fill-white" />
          </div>
        )}
        {/* 结束节点标记 */}
        {isEndNode && (
          <div
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-md z-10 flex items-center justify-center"
            title="结束节点"
          >
            <Square className="w-2 h-2 text-white fill-white" />
          </div>
        )}
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
            <div className={`text-sm font-medium text-foreground truncate ${type}`}>{label}</div>
            {description && !collapsed && (
              <div className="text-xs text-muted-foreground truncate mt-0.5">
                {description}
              </div>
            )}
          </div>

          {/* 操作按钮组 */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onDuplicate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDuplicate()
                    }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>复制节点</TooltipContent>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除节点</TooltipContent>
              </Tooltip>
            )}
            {onShowInfo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      onShowInfo()
                    }}
                  >
                    <Info className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>节点信息</TooltipContent>
              </Tooltip>
            )}
          </div>

          {onToggleCollapse && (
            <CollapsibleTrigger asChild>
              <Button
                variant="secondary"
                size="icon-sm"
                className="ml-1"
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
        {collapsed && !disableHandles && (
          <>
            {inputs.map((input, index) => (
              <HandleWrapper
                key={`collapsed-input-${input.property}`}
                port={input}
                type="target"
                isCollapsed={true}
                portIndex={index}
                totalPorts={inputs.length}
                disableHandles={disableHandles}
              />
            ))}
            {outputs.map((output, index) => (
              <HandleWrapper
                key={`collapsed-output-${output.property}`}
                port={output as INodeInputMetadata}
                type="source"
                isCollapsed={true}
                portIndex={index}
                totalPorts={outputs.length}
                disableHandles={disableHandles}
              />
            ))}
          </>
        )}

        {/* 端口区域 */}
        <CollapsibleContent asChild>
          <div
            className={cn(
              'flex flex-col gap-1 relative border-t py-2'
            )}
          >
            {Array.from({ length: Math.max(inputs.length, outputs.length) }).map(
              (_, index) => (
                <PortRow
                  key={`port-${index}`}
                  input={inputs[index]}
                  output={outputs[index]}
                  isCollapsed={collapsed}
                  disableHandles={disableHandles}
                />
              )
            )}

            {/* 自定义内容 - 折叠时不渲染以优化性能和高度计算 */}
            {!collapsed && (
              <div className="relative overflow-auto w-full max-h-[260px] px-2">
                {children}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export const WorkflowNode = memo(WorkflowNodeComponent)
WorkflowNode.displayName = 'WorkflowNode'
