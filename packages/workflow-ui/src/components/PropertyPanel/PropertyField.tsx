'use client'

import React, { useState, useEffect } from 'react'

interface PropertyFieldProps {
  label: string
  value: any
  onChange: (value: any) => void
}

export function PropertyField({ label, value, onChange }: PropertyFieldProps) {
  const [localValue, setLocalValue] = useState(String(value ?? ''))

  useEffect(() => {
    setLocalValue(String(value ?? ''))
  }, [value])

  const handleBlur = () => {
    onChange(parseValue(localValue))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onChange(parseValue(localValue))
    }
  }

  return (
    <div className="property-field">
      <label className="property-field-label">{label}</label>
      <input
        type="text"
        className="property-field-input"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}

/**
 * 解析输入值
 */
function parseValue(value: string): any {
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
