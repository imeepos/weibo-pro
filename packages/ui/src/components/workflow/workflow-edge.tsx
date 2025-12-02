'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath
} from '@xyflow/react'

import { cn } from '@sker/ui/lib/utils'

import type { WorkflowEdgeProps } from './types/workflow-nodes'
import { EdgeMode, IEdge } from './types'
function getLabel(mode?: EdgeMode) {
  switch (mode) {
    case EdgeMode.COMBINE_LATEST:
      return `最新值聚合`
    case EdgeMode.ZIP:
      return `配对执行`
    case EdgeMode.WITH_LATEST_FROM:
      return `主流携带`
    case EdgeMode.MERGE:
    default:
      return ``
  }
}
export function WorkflowEdge({
  id,
  source,
  target,
  data,
  selected = false,
  className,
  ...props
}: WorkflowEdgeProps & EdgeProps) {
  const { label, mode } = useMemo(() => {
    const edge = data.edge as IEdge
    const label = getLabel(edge?.mode)
    return { label, edge, mode: edge.mode }
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
    switch (mode) {
      case EdgeMode.ZIP:
        return '#10b981'
      case EdgeMode.WITH_LATEST_FROM:
        return '#ef4444'
      case EdgeMode.COMBINE_LATEST:
        return '#f59e0b'
      case EdgeMode.MERGE:
      default:
        return '#6b7280'
    }
  }, [mode])

  return (
    <>
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

      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
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
    </>
  )
}