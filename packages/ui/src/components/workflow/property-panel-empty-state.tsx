'use client'

import React, { ReactNode } from 'react'
import { cn } from '@udecode/cn'

export interface PropertyPanelEmptyStateProps {
  icon?: ReactNode
  title?: string
  description?: string
  className?: string
}

export function PropertyPanelEmptyState({
  icon,
  title = '未选中节点',
  description = '点击画布中的节点查看详细属性',
  className,
}: PropertyPanelEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-full text-center p-4', className)}>
      <div className="text-muted-foreground mb-4">
        {icon || (
          <svg className="h-12 w-12 mx-auto opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.037-.502.068-.75.097h-1.5c-.249-.03-.5-.06-.75-.097L4.5 3.104M14.25 3.104v5.714c0 .828.312 1.591.878 2.121l4.5 4.5M14.25 3.104c.251.037.502.068.75.097h1.5c.249-.03.5-.06.75-.097l2.25-2.403M12 18.75a6 6 0 00-6-6H4.5a6 6 0 00-6 6v.75a6 6 0 006 6h.75a6 6 0 006-6v-.75zm6-12a6 6 0 00-6-6h-.75a6 6 0 00-6 6v.75a6 6 0 006 6h.75a6 6 0 006-6V6.75z"
            />
          </svg>
        )}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-2">{description}</p>
    </div>
  )
}
