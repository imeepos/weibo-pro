'use client'

import { useState, useEffect } from 'react'
import type { KeyboardEvent } from 'react'
import { formatValueForInput, parseValue } from './utils'

export interface UseFieldCommitOptions {
  type: string
  value: any
  onChange: (value: any) => void
  disabled?: boolean
  setError: (error: string | null) => void
}

export interface UseFieldCommitReturn {
  localValue: string
  setLocalValue: (value: string) => void
  isFocused: boolean
  handleBlur: () => void
  handleFocus: () => void
  handleKeyDown: (e: KeyboardEvent) => void
}

/**
 * 共享的「本地编辑值 + 失焦/回车提交」逻辑
 * 用于 text / textarea / number / date / datetime-local / select 等字段
 */
export function useFieldCommit({
  type,
  value,
  onChange,
  disabled = false,
  setError,
}: UseFieldCommitOptions): UseFieldCommitReturn {
  const [localValue, setLocalValue] = useState(formatValueForInput(value, type))
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(formatValueForInput(value, type))
    }
  }, [value, type, isFocused])

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

  const handleKeyDown = (e: KeyboardEvent) => {
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

  return { localValue, setLocalValue, isFocused, handleBlur, handleFocus, handleKeyDown }
}
