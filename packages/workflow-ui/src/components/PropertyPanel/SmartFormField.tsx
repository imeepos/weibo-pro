'use client'

import React, { useState, useEffect } from 'react'
import './SmartFormField.css'

export interface SmartFormFieldProps {
  label: string
  value: any
  type?: string
  onChange: (value: any) => void
}

/**
 * 智能表单字段组件
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

  useEffect(() => {
    setLocalValue(formatValueForInput(value, type))
  }, [value, type])

  const handleBlur = () => {
    try {
      const parsedValue = parseValue(localValue, type)
      setError(null)
      onChange(parsedValue)
    } catch (err) {
      setError(err instanceof Error ? err.message : '输入格式错误')
    }
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
    switch (type) {
      case 'boolean':
        return (
          <label className="smart-form-checkbox">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              className="smart-form-checkbox-input"
            />
            <span className="smart-form-checkbox-label">{label}</span>
          </label>
        )

      case 'number':
        return (
          <input
            type="number"
            className={`smart-form-input ${error ? 'smart-form-input-error' : ''}`}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="输入数字"
          />
        )

      case 'date':
        return (
          <input
            type="date"
            className="smart-form-input"
            value={formatDateForInput(value)}
            onChange={(e) => onChange(new Date(e.target.value))}
          />
        )

      case 'datetime-local':
        return (
          <input
            type="datetime-local"
            className="smart-form-input"
            value={formatDateTimeForInput(value)}
            onChange={(e) => onChange(new Date(e.target.value))}
          />
        )

      case 'textarea':
        return (
          <textarea
            className={`smart-form-textarea ${error ? 'smart-form-textarea-error' : ''}`}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="输入多行文本..."
          />
        )

      case 'select':
        // 对于 select 类型，需要在装饰器中定义 options
        // 这里使用文本输入作为后备方案
        return (
          <input
            type="text"
            className={`smart-form-input ${error ? 'smart-form-input-error' : ''}`}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="输入选项值"
          />
        )

      case 'text':
      case 'string':
      default:
        return (
          <input
            type="text"
            className={`smart-form-input ${error ? 'smart-form-input-error' : ''}`}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder(type)}
          />
        )
    }
  }

  // 布尔类型使用特殊的布局
  if (type === 'boolean') {
    return (
      <div className="smart-form-field smart-form-field-boolean">
        {renderInput()}
      </div>
    )
  }

  // 其他类型使用标准布局
  return (
    <div className="smart-form-field">
      <label className="smart-form-label">{label}</label>
      {renderInput()}
      {error && <div className="smart-form-error">{error}</div>}
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