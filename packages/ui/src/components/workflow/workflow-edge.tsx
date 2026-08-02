'use client'

import React, { useMemo, useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react'
import { X } from 'lucide-react'

import { cn } from '@sker/ui/lib/utils'

import type { WorkflowEdgeProps } from './types/workflow-nodes'
import { EdgeMode, IEdge } from './types'
function getLabel(mode?: EdgeMode) {
  // 默认使用 COMBINE_LATEST（与后端一致）
  const actualMode = mode ?? EdgeMode.COMBINE_LATEST

  switch (actualMode) {
    case EdgeMode.COMBINE_LATEST:
      return ``
    case EdgeMode.ZIP:
      return ``
    case EdgeMode.WITH_LATEST_FROM:
      return ``
    case EdgeMode.MERGE:
      return ``
    default:
      return ``
  }
}
export function WorkflowEdge({
  id,
  source: _source,
  target: _target,
  data,
  selected = false,
  className,
  ...props
}: WorkflowEdgeProps & EdgeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { setEdges } = useReactFlow()

  const { label, mode } = useMemo(() => {
    const edge = data?.edge as IEdge
    const label = getLabel(edge?.mode)
    return { label, edge, mode: edge?.mode }
  }, [data])

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })

  const edgeColor = useMemo(() => {
    const actualMode = mode ?? EdgeMode.COMBINE_LATEST

    switch (actualMode) {
      case EdgeMode.ZIP:
        return '#10b981'
      case EdgeMode.WITH_LATEST_FROM:
        return '#ef4444'
      case EdgeMode.COMBINE_LATEST:
        return '#f59e0b'
      case EdgeMode.MERGE:
        return '#6b7280'
      default:
        return '#f59e0b'
    }
  }, [mode])

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setEdges(edges => edges.filter(edge => edge.id !== id))
  }

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <BaseEdge
        id={id}
        path={edgePath}
        className={cn(
          'stroke-2 transition-colors duration-200',
          selected && 'stroke-blue-500',
          className
        )}
        style={{
          stroke: selected ? '#3b82f6' : edgeColor,
        }}
      />

      {/* 边中点删除按钮 */}
      <EdgeLabelRenderer>
        <div
          className={cn(
            'absolute pointer-events-auto transition-all duration-150',
            (isHovered || selected) ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <button
            onMouseDown={handleDelete}
            className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center',
              'bg-background border border-input shadow-sm text-muted-foreground',
              'hover:bg-destructive hover:text-destructive-foreground hover:border-destructive',
              'hover:shadow-md',
              'transition-all duration-150 cursor-pointer'
            )}
            title="删除连线"
          >
            <X className="w-3 h-3" strokeWidth={2.5} />
          </button>
        </div>
      </EdgeLabelRenderer>

      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 20}px)`,
            }}
          >
            <div
              className={cn(
                'px-2 py-1 text-xs font-medium rounded-md border shadow-sm',
                selected
                  ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'
                  : 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600'
              )}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  )
}