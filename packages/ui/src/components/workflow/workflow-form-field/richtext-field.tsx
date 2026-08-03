'use client'

import { MarkdownEditor } from '@sker/ui/components/ui/markdown-editor'

export interface RichTextFieldProps {
  value: any
  onChange: (value: any) => void
  placeholder?: string
  disabled?: boolean
}

/** 富文本字段（richtext -> MarkdownEditor） */
export function RichTextField({
  value,
  onChange,
  placeholder,
  disabled = false,
}: RichTextFieldProps) {
  return (
    <MarkdownEditor
      value={typeof value === 'string' ? value : ''}
      onChange={onChange}
      placeholder={placeholder || '输入富文本内容...'}
      disabled={disabled}
      className="min-h-[120px]"
    />
  )
}
