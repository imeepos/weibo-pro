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
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <input
        type="text"
        className="w-full px-3 py-2 text-sm font-mono rounded-lg border bg-[var(--color-node-bg)] border-[var(--color-border)] text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-colors"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}

function parseValue(value: string): any {
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
      // 保持字符串
    }
  }
  return value
}
