/**
 * ScheduleDialog 的纯函数工具集
 */
import { WorkflowGraphAst, getInputMetadata, resolveConstructor } from '@sker/workflow'
import { CronExpressionParser } from 'cron-parser'
import type { CronTemplate, IntervalUnit, ScheduleFormData } from '@sker/ui/components/ui/schedule-form'

export const CRON_TEMPLATES: CronTemplate[] = [
  { label: '每小时', value: '0 * * * *', description: '每小时的第0分钟执行' },
  { label: '每天', value: '0 0 * * *', description: '每天午夜执行' },
  { label: '每周一', value: '0 0 * * 1', description: '每周一午夜执行' },
  { label: '每月1日', value: '0 0 1 * *', description: '每月1日午夜执行' },
  { label: '工作日', value: '0 9 * * 1-5', description: '工作日早上9点执行' },
  { label: '自定义', value: '__custom__', description: '手动输入Cron表达式' },
]

export const INTERVAL_UNITS: IntervalUnit[] = [
  { label: '秒', value: 1 },
  { label: '分钟', value: 60 },
  { label: '小时', value: 3600 },
  { label: '天', value: 86400 },
]

export function createEmptyFormData(): ScheduleFormData {
  return {
    name: '',
    scheduleType: 'cron',
    cronExpression: '0 * * * *',
    intervalValue: 1,
    intervalUnit: 60,
    inputs: '{}',
  }
}

/**
 * 提取工作流入口节点的默认输入值（只提取 @Input 装饰器标记的属性）
 */
export function extractDefaultInputs(workflow: WorkflowGraphAst): Record<string, unknown> {
  const defaultInputs: Record<string, unknown> = {}

  if (!workflow?.nodes || !workflow?.edges) {
    return defaultInputs
  }

  const entryNodes = workflow.entryNodeIds?.length
    ? workflow.nodes.filter((node) => workflow.entryNodeIds.includes(node.id))
    : workflow.nodes.filter((node) => !workflow.edges.some((edge: any) => edge.to === node.id))

  entryNodes.forEach((astNode: any) => {
    try {
      const ctor = resolveConstructor(astNode)
      const inputMetadatas = getInputMetadata(ctor)
      const metadataArray = Array.isArray(inputMetadatas) ? inputMetadatas : [inputMetadatas]

      metadataArray.forEach((metadata) => {
        const propKey = String(metadata.propertyKey)
        const fullKey = `${astNode.id}.${propKey}`
        const value = astNode[propKey]

        // 使用装饰器默认值或节点当前值
        const finalValue = value !== undefined ? value : metadata.defaultValue
        if (finalValue !== undefined) {
          defaultInputs[fullKey] = finalValue
        }
      })
    } catch (error) {
      console.warn('[extractDefaultInputs] 处理节点失败:', error)
    }
  })

  return defaultInputs
}

/**
 * 计算下次执行时间。
 * 修复：使用当前时间或未来的 startTime 作为基准，避免使用过去的时间。
 */
export function calculateNextRunTime(formData: ScheduleFormData): Date | undefined {
  try {
    let calculatedNextRun: Date | undefined

    if (formData.scheduleType === 'once' && formData.startTime) {
      calculatedNextRun = formData.startTime
    } else if (formData.scheduleType === 'cron' && formData.cronExpression) {
      if (formData.cronExpression === '__custom__') {
        calculatedNextRun = undefined
      } else {
        try {
          const now = new Date()
          const baseDate = formData.startTime && formData.startTime > now
            ? formData.startTime
            : now

          const interval = CronExpressionParser.parse(formData.cronExpression, {
            currentDate: baseDate,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone
          })
          const next = interval.next()
          calculatedNextRun = next.toDate()
        } catch {
          calculatedNextRun = undefined
        }
      }
    } else if (formData.scheduleType === 'interval') {
      const intervalSeconds = (formData.intervalValue || 1) * (formData.intervalUnit || 60)
      const startTime = formData.startTime || new Date()
      calculatedNextRun = new Date(startTime.getTime() + intervalSeconds * 1000)
    }

    return calculatedNextRun
  } catch {
    return undefined
  }
}

export function toIntervalSeconds(formData: ScheduleFormData): number | undefined {
  return formData.scheduleType === 'interval'
    ? (formData.intervalValue || 1) * (formData.intervalUnit || 60)
    : undefined
}

export function toCronExpression(formData: ScheduleFormData): string | undefined {
  return formData.scheduleType === 'cron' && formData.cronExpression !== '__custom__'
    ? formData.cronExpression
    : undefined
}

/**
 * 校验表单，返回错误信息；通过时返回 null。
 */
export function validateScheduleForm(formData: ScheduleFormData): string | null {
  if (!formData.name.trim()) {
    return '调度名称不能为空'
  }

  try {
    const parsed = JSON.parse(formData.inputs)
    if (typeof parsed !== 'object' || parsed === null) {
      return '输入参数必须是有效的 JSON 对象'
    }
  } catch {
    return '输入参数必须是有效的 JSON 格式'
  }

  if (formData.scheduleType === 'cron' && (!formData.cronExpression || formData.cronExpression === '__custom__')) {
    return 'Cron 表达式不能为空'
  }

  if (formData.scheduleType === 'interval' && (!formData.intervalValue || formData.intervalValue <= 0)) {
    return '间隔时间必须大于 0'
  }

  if ((formData.scheduleType === 'cron' || formData.scheduleType === 'interval')) {
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      return '结束时间必须晚于开始时间'
    }
  }

  return null
}

export function parseInputsJson(inputs: string): Record<string, unknown> {
  try {
    return JSON.parse(inputs)
  } catch {
    return {}
  }
}
