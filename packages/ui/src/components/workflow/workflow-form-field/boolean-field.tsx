'use client'

import { cn } from '@udecode/cn'

export interface BooleanFieldProps {
  label: string
  value: any
  onChange: (value: any) => void
  disabled?: boolean
  className?: string
}

/** 布尔开关字段（checkbox 样式） */
export function BooleanField({
  label,
  value,
  onChange,
  disabled = false,
  className,
}: BooleanFieldProps) {
  return (
    <div className={cn('mb-4', className)}>
      <label className={cn(
        'flex items-center cursor-pointer select-none p-2 rounded-lg',
        'hover:bg-accent/30 transition-colors duration-200',
        disabled && 'opacity-50 cursor-not-allowed'
      )}>
        <div className="relative">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => !disabled && onChange(e.target.checked)}
            disabled={disabled}
            className="sr-only"
          />
          <div className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200',
            value
              ? 'bg-primary border-primary'
              : 'bg-card border-border'
          )}>
            {Boolean(value) && (
              <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
        <span className="ml-3 text-sm font-medium text-foreground">{label}</span>
      </label>
    </div>
  )
}
