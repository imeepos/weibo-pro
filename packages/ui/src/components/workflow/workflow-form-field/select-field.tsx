'use client'

import { getInputClass } from './utils'
import { useFieldCommit } from './use-field-commit'

export interface SelectFieldProps {
  value: any
  onChange: (value: any) => void
  placeholder?: string
  disabled?: boolean
  error: string | null
  setError: (error: string | null) => void
  options?: string[]
}

/** 下拉选择字段（select） */
export function SelectField({
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  setError,
  options = [],
}: SelectFieldProps) {
  const { isFocused, handleBlur, handleFocus } = useFieldCommit({
    type: 'select',
    value,
    onChange,
    disabled,
    setError,
  })

  return (
    <select
      className={getInputClass(isFocused, error)}
      value={value || ''}
      onChange={(e) => !disabled && onChange(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}
