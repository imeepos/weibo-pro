'use client'

import React, { useEffect, useState } from 'react'
import { MiniMap } from '@xyflow/react'

import { cn } from '@sker/ui/lib/utils'

import type { WorkflowMinimapProps } from './types/workflow-canvas'

export function WorkflowMinimap({
  className,
  nodeColor,
}: WorkflowMinimapProps) {
  // 主题检测
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  // 监听主题变化
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

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
      nodeColor={nodeColor}
      maskColor={isDark ? 'rgba(17, 19, 24, 0.85)' : 'rgba(249, 250, 251, 0.85)'}
      style={{
        width: 200,
        height: 150,
      }}
    />
  )
}