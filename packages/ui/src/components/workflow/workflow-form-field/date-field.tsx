'use client'

import { formatDateForInput, formatDateTimeForInput, getInputClass } from './utils'
import { useFieldCommit } from './use-field-commit'

export type DateFieldInputType = 'date' | 'datetime-local'

export interface DateFieldProps {
  type: DateFieldInputType
  value: any
  onChange: (value: any) => void
  placeholder?: string
  disabled?: boolean
  error: string | null
  setError: (error: string | null) => void
}

/**
 * 日期类输入字段（date / datetime-local）
 * 变更时直接提交 Date，失焦时按 localValue 解析提交
 */
export function DateField({
  type,
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  setError,
}: DateFieldProps) {
  const { isFocused, handleBlur, handleFocus } = useFieldCommit({
    type,
    value,
    onChange,
    disabled,
    setError,
  })

  const inputValue = type === 'date' ? formatDateForInput(value) : formatDateTimeForInput(value)

  return (
    <input
      type={type}
      className={getInputClass(isFocused, error)}
      value={inputValue}
      onChange={(e) => !disabled && onChange(new Date(e.target.value))}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}
