/** 支持的输入字段类型 */
export type InputFieldType =
  | 'string'
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime-local'
  | 'select'
  | 'image'
  | 'video'
  | 'audio'
  | 'object'
  | 'any'

export interface WorkflowFormFieldProps {
  label: string
  value: any
  type?: InputFieldType
  onChange: (value: any) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
  uploadEndpoint?: string  // 图片上传接口
  options?: string[]  // 下拉选择框的选项列表（当 type 为 'select' 时使用）
}
