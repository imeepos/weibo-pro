'use client'

import React from 'react'
import { cn } from '@udecode/cn'

export interface PropertyPanelFieldProps {
  label: string
  value: any
  readonly?: boolean
  className?: string
}

export function PropertyPanelField({
  label,
  value,
  readonly = false,
  className,
}: PropertyPanelFieldProps) {
  const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')

  return (
    <div className={cn('space-y-1.5', readonly && 'opacity-70', className)}>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <div className="text-xs text-foreground font-mono bg-card/50 px-3 py-2 rounded-lg border border-border/50 break-all">
        {displayValue}
      </div>
    </div>
  )
}
