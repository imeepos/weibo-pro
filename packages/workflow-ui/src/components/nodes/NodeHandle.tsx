import React, { useState, useEffect } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { HandleType } from '../../types'
import { cn } from '../../utils/cn'

interface NodeHandleProps {
  id: string
  type: HandleType
  label: string
  isMulti?: boolean
}

export function NodeHandle({ id, type, label, isMulti }: NodeHandleProps) {
  const position = type === 'source' ? Position.Right : Position.Left
  const isInput = type === 'target'
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const handleClasses = cn(
    '!w-3 !h-3 !border-2',
    'transition-all duration-200',
    'hover:!w-4 hover:!h-4',
    isInput
      ? 'group-hover:!border-[var(--workflow-accent)] !border-[var(--workflow-accent)] hover:!bg-[var(--workflow-accent)]/20'
      : 'group-hover:!border-[var(--workflow-success)] !border-[var(--workflow-success)] hover:!bg-[var(--workflow-success)]/20'
  )

  return (
    <div
      className={cn(
        'relative py-1 group',
        'flex items-center',
        isInput ? 'justify-start' : 'justify-end',
        'transition-opacity duration-150',
        !hasMounted && 'opacity-0'
      )}
    >
      <div className={cn(
        'flex items-center',
        isInput ? 'flex-row' : 'flex-row-reverse'
      )}>
        <div className={cn(
          'absolute top-1/2 -translate-y-1/2',
          isInput ? 'left-0' : 'right-0',
          'w-3 h-3'
        )}>
          <Handle
            type={type}
            position={position}
            id={id}
            className={handleClasses}
          />
        </div>

        <span className={cn(
          'text-xs font-medium select-none transition-colors duration-150',
          isInput
            ? 'text-[var(--workflow-accent)]/80 group-hover:text-[var(--workflow-accent)] pl-4'
            : 'text-[var(--workflow-success)]/80 group-hover:text-[var(--workflow-success)] pr-4'
        )}>
          {label}
          {isMulti && (
            <span className="ml-1 text-[var(--workflow-muted)] font-mono text-[10px]">[]</span>
          )}
        </span>
      </div>
    </div>
  )
}
