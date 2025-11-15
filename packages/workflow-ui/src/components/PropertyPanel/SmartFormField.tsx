'use client'

import React, { useState, useEffect } from 'react'

export interface SmartFormFieldProps {
  label: string
  value: any
  type?: string
  onChange: (value: any) => void
}

/**
 * 智能表单字段组件 - 数字时代的交互诗篇
 *
 * 根据类型自动选择合适的输入控件：
 * - text: 文本输入框
 * - number: 数字输入框
 * - boolean: 复选框
 * - date: 日期选择器
 * - datetime-local: 日期时间选择器
 * - select: 下拉选择框（需要配合 options 使用）
 * - textarea: 多行文本框
 * - any/default: 智能解析输入（保持原有逻辑）
 */
export function SmartFormField({ label, value, type = 'any', onChange }: SmartFormFieldProps) {
  const [localValue, setLocalValue] = useState(formatValueForInput(value, type))
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    setLocalValue(formatValueForInput(value, type))
  }, [value, type])

  const handleBlur = () => {
    setIsFocused(false)
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
    if (e.key === 'Enter') {
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
    setLocalValue(String(newValue))
    setError(null)
  }

  const renderInput = () => {
    const baseInputClass = `w-full px-3 py-2 text-sm border rounded-lg transition-all duration-200 box-border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
      isFocused ? 'border-indigo-500 shadow-sm' : 'border-slate-700/50 hover:border-slate-600'
    } ${error ? 'border-red-500/50 bg-red-500/10 focus:border-red-500 focus:ring-red-500' : 'bg-slate-800/50 text-slate-200'}`

    switch (type) {
      case 'boolean':
        return (
          <label className="flex items-center cursor-pointer select-none p-2 rounded-lg hover:bg-slate-800/30 transition-colors duration-200">
            <div className="relative">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                Boolean(value)
                  ? 'bg-indigo-500 border-indigo-500'
                  : 'bg-slate-800/50 border-slate-700/50'
              }`}>
                {Boolean(value) && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            <span className="ml-3 text-sm font-medium text-slate-300 cursor-pointer">{label}</span>
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
              placeholder="0"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500">
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
            onChange={(e) => onChange(new Date(e.target.value))}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        )

      case 'datetime-local':
        return (
          <input
            type="datetime-local"
            className={baseInputClass}
            value={formatDateTimeForInput(value)}
            onChange={(e) => onChange(new Date(e.target.value))}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        )

      case 'textarea':
        return (
          <textarea
            className={`${baseInputClass} resize-y min-h-[80px] font-mono`}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="在此输入多行文本..."
          />
        )

      case 'select':
        return (
          <input
            type="text"
            className={baseInputClass}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="选择或输入..."
          />
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
            placeholder={getPlaceholder(type)}
          />
        )
    }
  }

  if (type === 'boolean') {
    return <div className="mb-4">{renderInput()}</div>
  }

  return (
    <div className="mb-4">
      <label className="block mb-2 text-xs font-medium text-slate-400 leading-tight">{label}</label>
      {renderInput()}
      {error && <div className="mt-2 text-xs text-red-400 font-medium animate-pulse">{error}</div>}
    </div>
  )
}

/**
 * 将值格式化为适合输入框显示的字符串
 */
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
    case 'select':
      return String(value)
    default:
      // 对于 any 类型，智能处理
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
      }
      return String(value)
  }
}

/**
 * 格式化日期为输入框格式
 */
function formatDateForInput(value: any): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return ''
}

/**
 * 格式化日期时间为输入框格式
 */
function formatDateTimeForInput(value: any): string {
  if (value instanceof Date) {
    const date = new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    return date.toISOString().slice(0, 16)
  }
  return ''
}

/**
 * 解析输入值为合适的类型
 */
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
    case 'select':
      return value

    default:
      // 对于 any 类型，智能解析
      return parseSmartValue(value)
  }
}

/**
 * 智能解析值（保持原有逻辑）
 */
function parseSmartValue(value: string): any {
  // 尝试解析为数字
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10)
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    return parseFloat(value)
  }

  // 尝试解析为布尔值
  if (value === 'true') return true
  if (value === 'false') return false

  // 尝试解析为 JSON
  if (value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value)
    } catch {
      // 保持字符串
    }
  }

  return value
}

/**
 * 获取输入框占位符文本
 */
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
    case 'select':
      return '选择选项'
    default:
      return '输入文本...'
  }
}