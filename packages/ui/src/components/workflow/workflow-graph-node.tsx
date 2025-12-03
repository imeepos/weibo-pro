'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@sker/ui/lib/utils'

const graphNodeVariants = cva(
  'relative transition-all duration-200 cursor-pointer select-none hover:opacity-90',
  {
    variants: {
      variant: {
        default: 'bg-background/95 backdrop-blur-sm',
        minimal: 'bg-transparent',
        colorful: 'bg-gradient-to-br from-background/90 to-background/70',
        modern: 'bg-card/80 backdrop-blur-md',
      }
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)



export interface WorkflowGraphNodeProps extends VariantProps<typeof graphNodeVariants> {
  name?: string
  nodeCount: number
  edgeCount: number
  collapsed?: boolean
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

export const WorkflowGraphNode: React.FC<WorkflowGraphNodeProps> = ({
  variant,
  onClick,
  className
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(e)
  }

  return (
   <div
      className={cn(
        graphNodeVariants({ variant }),
        'px-3 py-2 space-y-2',
        className
      )}
      onClick={handleClick}
      data-slot="workflow-graph-expanded"
    >
      <div className={cn(
        'text-[10px] text-center py-2',
        variant === 'colorful' ? 'text-muted-foreground/90' : 'text-muted-foreground'
      )}>
        打开子工作流
      </div>
    </div>
  )
}

WorkflowGraphNode.displayName = 'WorkflowGraphNode'
