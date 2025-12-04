'use client'

import React, { useState, useEffect, lazy, Suspense } from 'react'
import { cn } from '@udecode/cn'
import { MarkdownEditor } from '@sker/ui/components/ui/markdown-editor'

/** 支持的输入字段类型 */
export type InputFieldType =
  | 'string'
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime-local'
  | 'any'

export interface WorkflowFormFieldProps {
  label: string
  value: any
  type?: InputFieldType
  onChange: (value: any) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
}

export function WorkflowFormField({
  label,
  value,
  type = 'any',
  onChange,
  placeholder,
  error: externalError,
  disabled = false,
  className,
}: WorkflowFormFieldProps) {
  const [localValue, setLocalValue] = useState(formatValueForInput(value, type))
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(formatValueForInput(value, type))
    }
  }, [value, type, isFocused])

  useEffect(() => {
    if (externalError) {
      setError(externalError)
    }
  }, [externalError])

  const handleBlur = () => {
    setIsFocused(false)
    if (disabled) return

    try {
      const parsedValue = parseValue(localValue, type)
      setError(null)
      onChange(parsedValue)
    } catch (err) {
      setError(err instanceof Error ? err.message : '输入格式错误')
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled) {
      try {
        const parsedValue = parseValue(localValue, type)
        setError(null)
        onChange(parsedValue)
      } catch (err) {
        setError(err instanceof Error ? err.message : '输入格式错误')
      }
    }
  }

  const handleChange = (newValue: string | boolean) => {
    const stringValue = String(newValue)
    setLocalValue(stringValue)
    setError(null)

    if (disabled) return

    // 实时同步策略：根据类型决定是否立即同步
    try {
      let parsedValue: any

      switch (type) {
        case 'text':
        case 'string':
        case 'textarea':
          // 文本类型：直接同步字符串
          parsedValue = stringValue
          break

        case 'number':
          // 数字类型：尝试解析，失败则不同步（等待用户输入完成）
          if (!stringValue.trim()) {
            parsedValue = 0
          } else {
            const num = Number(stringValue)
            if (isNaN(num)) {
              // 输入到一半，等待用户继续输入
              return
            }
            parsedValue = num
          }
          break

        case 'any':
          // any 类型：智能解析
          parsedValue = parseSmartValue(stringValue)
          break

        default:
          // 其他类型保持 onBlur 行为
          return
      }

      onChange(parsedValue)
    } catch {
      // 解析失败，等待用户继续输入
    }
  }

  const baseInputClass = cn(
    'w-full px-3 py-2 text-sm border rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    isFocused ? 'border-primary shadow-sm' : 'border-border hover:border-border/80',
    error ? 'border-destructive/50 bg-destructive/10 focus:border-destructive focus:ring-destructive/50' : 'bg-card text-foreground'
  )

  const renderInput = () => {
    switch (type) {
      case 'boolean':
        return (
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
                Boolean(value)
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
        )

      case 'number':
        return (
          <div className="relative">
            <input
              type="number"
              className={baseInputClass}
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || '0'}
              disabled={disabled}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
          </div>
        )

      case 'date':
        return (
          <input
            type="date"
            className={baseInputClass}
            value={formatDateForInput(value)}
            onChange={(e) => !disabled && onChange(new Date(e.target.value))}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
          />
        )

      case 'datetime-local':
        return (
          <input
            type="datetime-local"
            className={baseInputClass}
            value={formatDateTimeForInput(value)}
            onChange={(e) => !disabled && onChange(new Date(e.target.value))}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
          />
        )

      case 'textarea':
        return (
          <textarea
            className={cn(baseInputClass, 'resize-y min-h-[80px] font-mono')}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder={placeholder || '在此输入多行文本...'}
            disabled={disabled}
          />
        )

      case 'richtext':
        return (
          <Suspense fallback={<div className={cn(baseInputClass, 'min-h-[120px] animate-pulse')} />}>
            <MarkdownEditor
              value={typeof value === 'string' ? value : ''}
              onChange={onChange}
              placeholder={placeholder || '输入富文本内容...'}
              disabled={disabled}
              className="min-h-[120px]"
            />
          </Suspense>
        )

      case 'text':
      case 'string':
      default:
        return (
          <input
            type="text"
            className={baseInputClass}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || getPlaceholder(type)}
            disabled={disabled}
          />
        )
    }
  }

  if (type === 'boolean') {
    return <div className={cn('mb-4', className)}>{renderInput()}</div>
  }

  return (
    <div className={cn('mb-4', className)}>
      {label && <label className="block mb-2 text-xs font-medium text-muted-foreground leading-tight">{label}</label>}
      {renderInput()}
      {error && (
        <div className="mt-2 text-xs text-destructive font-medium animate-pulse">{error}</div>
      )}
    </div>
  )
}

function formatValueForInput(value: any, type: string): string {
  if (value === null || value === undefined) {
    return ''
  }

  switch (type) {
    case 'date':
    case 'datetime-local':
      return value instanceof Date ? value.toISOString().slice(0, 10) : String(value)
    case 'number':
      return String(Number(value))
    case 'boolean':
      return String(Boolean(value))
    case 'text':
    case 'string':
    case 'textarea':
      return String(value)
    default:
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
      }
      return String(value)
  }
}

function formatDateForInput(value: any): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return ''
}

function formatDateTimeForInput(value: any): string {
  if (value instanceof Date) {
    const date = new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    return date.toISOString().slice(0, 16)
  }
  return ''
}

function parseValue(value: string, type: string): any {
  if (!value.trim()) {
    return type === 'number' ? 0 : ''
  }

  switch (type) {
    case 'number':
      const num = Number(value)
      if (isNaN(num)) {
        throw new Error('请输入有效的数字')
      }
      return num

    case 'boolean':
      return value.toLowerCase() === 'true'

    case 'date':
    case 'datetime-local':
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        throw new Error('请输入有效的日期')
      }
      return date

    case 'text':
    case 'string':
    case 'textarea':
      return value

    default:
      return parseSmartValue(value)
  }
}

function parseSmartValue(value: string): any {
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10)
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    return parseFloat(value)
  }

  if (value === 'true') return true
  if (value === 'false') return false

  if (value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value)
    } catch {
      // Keep as string
    }
  }

  return value
}

function getPlaceholder(type: string): string {
  switch (type) {
    case 'number':
      return '输入数字'
    case 'date':
      return '选择日期'
    case 'datetime-local':
      return '选择日期时间'
    case 'textarea':
      return '输入多行文本...'
    default:
      return '输入文本...'
  }
}
