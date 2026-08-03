'use client'

import React, { ReactNode } from 'react'
import { cn } from '@udecode/cn'
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../ui/accordion'

export interface PropertyPanelSectionProps {
  id: string
  title: string
  color?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function PropertyPanelSection({
  id,
  title,
  color = 'primary',
  actions,
  children,
  className,
}: PropertyPanelSectionProps) {
  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
    secondary: 'bg-secondary',
  }

  return (
    <AccordionItem value={id} className={cn('border-border rounded-lg overflow-hidden', className)}>
      <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50 data-[state=open]:bg-accent/30">
        <div className="flex items-center justify-between flex-1 mr-2">
          <div className="flex items-center gap-2">
            <div className={cn('w-1.5 h-1.5 rounded-full', colorClasses[color as keyof typeof colorClasses] || 'bg-primary')} />
            <span className="text-sm font-semibold text-foreground">{title}</span>
          </div>
          {actions && <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>{actions}</div>}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-3 pt-2">{children}</div>
      </AccordionContent>
    </AccordionItem>
  )
}
