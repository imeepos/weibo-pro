'use client'

import React from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react'

import { cn } from '@sker/ui/lib/utils'

import type { WorkflowEdgeProps } from './types/workflow-nodes'

export function WorkflowEdge({
  id,
  source,
  target,
  data,
  selected = false,
  className,
  ...props
}: WorkflowEdgeProps & EdgeProps) {
  const { label, type = 'default' } = data || {}

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })

  const getEdgeColor = () => {
    switch (type) {
      case 'success':
        return '#10b981'
      case 'error':
        return '#ef4444'
      case 'warning':
        return '#f59e0b'
      default:
        return '#6b7280'
    }
  }

  const edgeColor = getEdgeColor()

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