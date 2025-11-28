'use client'

import React from 'react'
import { MiniMap } from '@xyflow/react'

import { cn } from '@sker/ui/lib/utils'

import type { WorkflowMinimapProps } from './types/workflow-canvas'

export function WorkflowMinimap({
  className,
}: WorkflowMinimapProps) {
  return (
    <MiniMap
      className={cn(
        'bg-background border border-border rounded-lg shadow-lg',
        className
      )}
      position="bottom-right"
      pannable
      zoomable
      nodeStrokeWidth={2}
      nodeColor="#3b82f6"
      maskColor="rgba(0, 0, 0, 0.1)"
      style={{
        width: 200,
        height: 150,
      }}
    />
  )
}