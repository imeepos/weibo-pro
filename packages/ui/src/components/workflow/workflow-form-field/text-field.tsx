'use client'

import { cn } from '@udecode/cn'
import { parseSmartValue, getPlaceholder, getInputClass } from './utils'
import { useFieldCommit } from './use-field-commit'

export type TextFieldInputType = 'string' | 'text' | 'textarea' | 'number' | 'any' | 'object'

export interface TextFieldProps {
  type: TextFieldInputType | string
  value: any
  onChange: (value: any) => void
  placeholder?: string
  disabled?: boolean
  error: string | null
  setError: (error: string | null) => void
}

/**
 * 文本类输入字段（string / text / textarea / number / any / object）
 * 维护本地编辑值 localValue，失焦或回车时解析并提交
 */
export function TextField({
  type,
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  setError,
}: TextFieldProps) {
  const { localValue, setLocalValue, isFocused, handleBlur, handleFocus, handleKeyDown } = useFieldCommit({
    type,
    value,
    onChange,
    disabled,
    setError,
  })

  const handleChange = (newValue: string) => {
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

  const baseInputClass = getInputClass(isFocused, error)

  if (type === 'number') {
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
  }

  if (type === 'textarea') {
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
  }

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
