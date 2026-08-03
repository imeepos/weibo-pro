import { cn } from '@udecode/cn'

/** 格式化值为输入框可编辑的字符串 */
export function formatValueForInput(value: any, type: string): string {
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
      return String(value)
    default:
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
      }
      return String(value)
  }
}

export function formatDateForInput(value: any): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return ''
}

export function formatDateTimeForInput(value: any): string {
  if (value instanceof Date) {
    const date = new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    return date.toISOString().slice(0, 16)
  }
  return ''
}

export function parseValue(value: string, type: string): any {
  if (!value.trim()) {
    return type === 'number' ? 0 : ''
  }

  switch (type) {
    case 'number': {
      const num = Number(value)
      if (isNaN(num)) {
        throw new Error('请输入有效的数字')
      }
      return num
    }

    case 'boolean':
      return value.toLowerCase() === 'true'

    case 'date':
    case 'datetime-local': {
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        throw new Error('请输入有效的日期')
      }
      return date
    }

    case 'text':
    case 'string':
    case 'textarea':
      return value

    default:
      return parseSmartValue(value)
  }
}

export function parseSmartValue(value: string): any {
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
      // Keep as string
    }
  }

  return value
}

export function getPlaceholder(type: string): string {
  switch (type) {
    case 'number':
      return '输入数字'
    case 'date':
      return '选择日期'
    case 'datetime-local':
      return '选择日期时间'
    case 'textarea':
      return '输入多行文本...'
    case 'image':
      return '上传图片'
    case 'video':
      return '上传视频'
    case 'audio':
      return '上传音频'
    default:
      return '输入文本...'
  }
}

export function getInputClass(isFocused: boolean, error: string | null): string {
  return cn(
    'w-full px-3 py-2 text-sm border rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    isFocused ? 'border-primary shadow-sm' : 'border-border hover:border-border/80',
    error ? 'border-destructive/50 bg-destructive/10 focus:border-destructive focus:ring-destructive/50' : 'bg-card text-foreground'
  )
}
