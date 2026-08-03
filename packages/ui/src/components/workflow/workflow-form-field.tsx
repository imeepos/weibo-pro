'use client'

import { useState, useEffect } from 'react'
import { cn } from '@udecode/cn'
import { ImageField } from './workflow-form-field/image-field'
import { VideoField } from './workflow-form-field/video-field'
import { AudioField } from './workflow-form-field/audio-field'
import { BooleanField } from './workflow-form-field/boolean-field'
import { SelectField } from './workflow-form-field/select-field'
import { DateField } from './workflow-form-field/date-field'
import { RichTextField } from './workflow-form-field/richtext-field'
import { TextField } from './workflow-form-field/text-field'

export type { InputFieldType, WorkflowFormFieldProps } from './workflow-form-field/types'
import type { WorkflowFormFieldProps } from './workflow-form-field/types'

/**
 * 工作流表单字段
 *
 * 按 type 分派到对应子组件：
 * - string/text/textarea/number/any/object -> TextField
 * - date/datetime-local -> DateField
 * - select -> SelectField
 * - boolean -> BooleanField
 * - richtext -> RichTextField
 * - image/video/audio -> 对应媒体上传字段
 */
export function WorkflowFormField({
  label,
  value,
  type = 'any',
  onChange,
  placeholder,
  error: externalError,
  disabled = false,
  className,
  uploadEndpoint,
  options = [],
}: WorkflowFormFieldProps) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (externalError) {
      setError(externalError)
    }
  }, [externalError])

  const renderInput = () => {
    switch (type) {
      case 'image':
        return (
          <ImageField
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            uploadEndpoint={uploadEndpoint}
            setError={setError}
          />
        )

      case 'video':
        return (
          <VideoField
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            uploadEndpoint={uploadEndpoint}
            setError={setError}
          />
        )

      case 'audio':
        return (
          <AudioField
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            uploadEndpoint={uploadEndpoint}
            setError={setError}
          />
        )

      case 'boolean':
        return (
          <BooleanField
            label={label}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={className}
          />
        )

      case 'select':
        return (
          <SelectField
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            error={error}
            setError={setError}
            options={options}
          />
        )

      case 'date':
      case 'datetime-local':
        return (
          <DateField
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            error={error}
            setError={setError}
          />
        )

      case 'richtext':
        return (
          <RichTextField
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
          />
        )

      case 'number':
      case 'textarea':
      case 'text':
      case 'string':
      case 'any':
      case 'object':
      default:
        return (
          <TextField
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            error={error}
            setError={setError}
          />
        )
    }
  }

  if (type === 'boolean') {
    return renderInput()
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
