export interface CronTemplate {
  label: string
  value: string
  description: string
}

export interface IntervalUnit {
  label: string
  value: number
}

export interface ScheduleFormData {
  name: string
  scheduleType: string
  cronExpression?: string
  intervalValue?: number
  intervalUnit?: number
  inputs: string
  startTime?: Date
  endTime?: Date
  nextRunTime?: Date
}

export interface ScheduleFormProps {
  data: ScheduleFormData
  onChange: (data: Partial<ScheduleFormData>) => void
  cronTemplates?: CronTemplate[]
  intervalUnits?: IntervalUnit[]
  className?: string
  showInputsField?: boolean  // 是否显示输入参数 JSON 字段（默认 true）
}

export const DEFAULT_CRON_TEMPLATES: CronTemplate[] = [
  { label: '每小时', value: '0 * * * *', description: '每小时的第0分钟执行' },
  { label: '每天', value: '0 0 * * *', description: '每天午夜执行' },
  { label: '每周一', value: '0 0 * * 1', description: '每周一午夜执行' },
  { label: '每月1日', value: '0 0 1 * *', description: '每月1日午夜执行' },
  { label: '工作日', value: '0 9 * * 1-5', description: '工作日早上9点执行' },
  { label: '自定义', value: '__custom__', description: '手动输入Cron表达式' },
]

export const DEFAULT_INTERVAL_UNITS: IntervalUnit[] = [
  { label: '秒', value: 1 },
  { label: '分钟', value: 60 },
  { label: '小时', value: 3600 },
  { label: '天', value: 86400 },
]

/**
 * 将 Date 转换为本地时间的 datetime-local input 格式 (YYYY-MM-DDTHH:mm)
 * 不使用 toISOString() 以避免时区转换问题
 */
export const toDateTimeInput = (date?: Date): string => {
  if (!date) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export const toDisplayTime = (date?: Date): string =>
  date?.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).replace(/\//g, '-') ?? ''
