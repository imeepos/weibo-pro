'use client'

import React from 'react'
import { cn } from '@udecode/cn'

export interface NodeStateBadgeProps {
  state: 'running' | 'success' | 'fail' | 'idle' | string
  className?: string
}

export function NodeStateBadge({ state, className }: NodeStateBadgeProps) {
  const stateConfig = {
    running: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    fail: 'bg-red-500/20 text-red-300 border-red-500/30',
    idle: 'bg-muted/20 text-muted-foreground border-border',
  }

  const badgeClass = stateConfig[state as keyof typeof stateConfig] || stateConfig.idle

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize',
        badgeClass,
        className
      )}
    >
      {state}
    </span>
  )
}
