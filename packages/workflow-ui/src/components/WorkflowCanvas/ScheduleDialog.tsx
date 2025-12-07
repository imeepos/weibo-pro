'use client'

import React, { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { WorkflowController } from '@sker/sdk'
import type { WorkflowScheduleEntity } from '@sker/entities'
import { root } from '@sker/core'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,

} from '@sker/ui/components/ui/dialog'
import {
  Button,
} from '@sker/ui/components/ui/button'
import {
  ScheduleForm,
  type ScheduleFormData,
  type CronTemplate,
  type IntervalUnit,
} from '@sker/ui/components/ui/schedule-form'
import { WorkflowGraphAst, fromJson, getInputMetadata, resolveConstructor, type IEdge } from '@sker/workflow'

/**
 * 调度对话框
 *
 * 存在即合理:
 * - 创建工作流调度任务
 * - 编辑现有调度配置
 * - 支持多种调度类型(Cron/间隔/一次性/手动)
 * - 自动计算下次执行时间
 * - 输入参数配置
 *
 * 优雅设计:
 * - 使用 @sker/ui Dialog 和 ScheduleForm 组件
 * - 表单验证清晰明了
 * - 响应式布局
 * - 编辑模式自动填充数据
 */
export interface ScheduleDialogProps {
  workflowName: string
  schedule?: WorkflowScheduleEntity | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

const CRON_TEMPLATES: CronTemplate[] = [
  { label: '每小时', value: '0 * * * *', description: '每小时的第0分钟执行' },
  { label: '每天', value: '0 0 * * *', description: '每天午夜执行' },
  { label: '每周一', value: '0 0 * * 1', description: '每周一午夜执行' },
  { label: '每月1日', value: '0 0 1 * *', description: '每月1日午夜执行' },
  { label: '工作日', value: '0 9 * * 1-5', description: '工作日早上9点执行' },
  { label: '自定义', value: '__custom__', description: '手动输入Cron表达式' },
]

const INTERVAL_UNITS: IntervalUnit[] = [
  { label: '秒', value: 1 },
  { label: '分钟', value: 60 },
  { label: '小时', value: 3600 },
  { label: '天', value: 86400 },
]

export function ScheduleDialog({
  workflowName,
  schedule,
  open,
  onOpenChange,
  onSuccess
}: ScheduleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [formData, setFormData] = useState<ScheduleFormData>({
    name: '',
    scheduleType: 'cron',
    cronExpression: '0 * * * *',
    intervalValue: 1,
    intervalUnit: 60,
    inputs: '{}',
  })
  const [workflowAst, setWorkflowAst] = useState<WorkflowGraphAst | null>(null)

  const client = root.get<WorkflowController>(WorkflowController) as any
  const isEditMode = !!schedule

  /**
   * 提取工作流入口节点的默认输入值
   *
   * 存在即合理：
   * - 扫描所有入度为 0 的节点（入口节点）
   * - 提取 @Input 装饰器的属性值
   * - 优先级：节点当前值 > 装饰器默认值
   *
   * 优雅设计：
   * - 复用 RunConfigDialog 的提取逻辑
   * - 返回结构化的 JSON 对象
   */
  const extractDefaultInputs = (workflow: WorkflowGraphAst): Record<string, unknown> => {
    const defaultInputs: Record<string, unknown> = {}

    if (!workflow?.nodes || !workflow?.edges) {
      return defaultInputs
    }

    // 找到所有入口节点（入度为 0）
    const entryNodes = workflow.nodes.filter((node) => {
      const hasIncomingEdges = workflow.edges.some((edge: IEdge) => edge.to === node.id)
      return !hasIncomingEdges
    })

    // 提取每个入口节点的 @Input 属性值
    entryNodes.forEach((astNode: any) => {
      try {
        const ctor = resolveConstructor(astNode)
        const inputMetadatas = getInputMetadata(ctor)
        const metadataArray = Array.isArray(inputMetadatas) ? inputMetadatas : [inputMetadatas]

        metadataArray.forEach((metadata) => {
          const propKey = String(metadata.propertyKey)
          const fullKey = `${astNode.id}.${propKey}`

          // 优先使用节点当前值，否则使用装饰器默认值
          const nodeValue = astNode[propKey]
          const finalValue = nodeValue !== undefined ? nodeValue : metadata.defaultValue

          // 只添加有效值（排除 undefined）
          if (finalValue !== undefined) {
            defaultInputs[fullKey] = finalValue
          }
        })
      } catch (error) {
        console.warn('提取节点默认输入失败:', astNode.id, error)
      }
    })

    return defaultInputs
  }

  // 获取工作流 AST（用于提取默认输入）
  useEffect(() => {
    const fetchWorkflow = async () => {
      if (!open || isEditMode) return // 编辑模式不需要重新获取

      try {
        const workflow = await client.getWorkflow({ name: workflowName })
        if (workflow) {
          const ast = fromJson<WorkflowGraphAst>(workflow)
          setWorkflowAst(ast)
        }
      } catch (error) {
        console.error('获取工作流失败:', error)
      }
    }

    fetchWorkflow()
  }, [open, workflowName, isEditMode])

  // 编辑/新建模式下初始化表单数据
  useEffect(() => {
    if (schedule) {
      // 编辑模式：使用现有调度的配置
      const newFormData: ScheduleFormData = {
        name: schedule.name,
        scheduleType: schedule.scheduleType,
        inputs: JSON.stringify(schedule.inputs || {}, null, 2),
        startTime: schedule.startTime ? new Date(schedule.startTime) : undefined,
        endTime: schedule.endTime ? new Date(schedule.endTime) : undefined,
      }

      if (schedule.scheduleType === 'cron' && schedule.cronExpression) {
        newFormData.cronExpression = schedule.cronExpression
      }

      if (schedule.scheduleType === 'interval' && schedule.intervalSeconds) {
        const seconds = schedule.intervalSeconds
        if (seconds % 86400 === 0) {
          newFormData.intervalValue = seconds / 86400
          newFormData.intervalUnit = 86400
        } else if (seconds % 3600 === 0) {
          newFormData.intervalValue = seconds / 3600
          newFormData.intervalUnit = 3600
        } else if (seconds % 60 === 0) {
          newFormData.intervalValue = seconds / 60
          newFormData.intervalUnit = 60
        } else {
          newFormData.intervalValue = seconds
          newFormData.intervalUnit = 1
        }
      }

      setFormData(newFormData)
    } else if (workflowAst) {
      // 新建模式：自动提取入口节点的默认值
      const defaultInputs = extractDefaultInputs(workflowAst)
      const inputsJson = Object.keys(defaultInputs).length > 0
        ? JSON.stringify(defaultInputs, null, 2)
        : '{}'

      setFormData({
        name: '',
        scheduleType: 'cron',
        cronExpression: '0 * * * *',
        intervalValue: 1,
        intervalUnit: 60,
        inputs: inputsJson,  // 使用提取的默认值
      })
    }
  }, [schedule, workflowAst])

  useEffect(() => {
    calculateNextRunTime()
  }, [formData.scheduleType, formData.cronExpression, formData.intervalValue, formData.intervalUnit, formData.startTime])

  const calculateNextRunTime = async () => {
    try {
      let calculatedNextRun: Date | undefined

      if (formData.scheduleType === 'once' && formData.startTime) {
        calculatedNextRun = formData.startTime
      } else if (formData.scheduleType === 'cron' && formData.cronExpression) {
        try {
          calculatedNextRun = new Date(Date.now() + 60000)
        } catch {
          calculatedNextRun = undefined
        }
      } else if (formData.scheduleType === 'interval') {
        const intervalSeconds = (formData.intervalValue || 1) * (formData.intervalUnit || 60)
        calculatedNextRun = new Date(Date.now() + intervalSeconds * 1000)
      }

      setFormData(prev => ({ ...prev, nextRunTime: calculatedNextRun }))
    } catch {
      setFormData(prev => ({ ...prev, nextRunTime: undefined }))
    }
  }

  const validateInputs = () => {
    if (!formData.name.trim()) {
      setError('调度名称不能为空')
      return false
    }

    try {
      const parsed = JSON.parse(formData.inputs)
      if (typeof parsed !== 'object' || parsed === null) {
        setError('输入参数必须是有效的 JSON 对象')
        return false
      }
    } catch {
      setError('输入参数必须是有效的 JSON 格式')
      return false
    }

    if (formData.scheduleType === 'cron' && (!formData.cronExpression || formData.cronExpression === '__custom__')) {
      setError('Cron 表达式不能为空')
      return false
    }

    if (formData.scheduleType === 'interval' && (!formData.intervalValue || formData.intervalValue <= 0)) {
      setError('间隔时间必须大于 0')
      return false
    }

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      setError('结束时间必须晚于开始时间')
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    setError('')

    if (!validateInputs()) {
      return
    }

    setLoading(true)

    try {
      const intervalSeconds = formData.scheduleType === 'interval'
        ? (formData.intervalValue || 1) * (formData.intervalUnit || 60)
        : undefined

      const cronExpr = formData.scheduleType === 'cron' && formData.cronExpression !== '__custom__'
        ? formData.cronExpression
        : undefined

      if (isEditMode && schedule) {
        await client.updateSchedule(schedule.id, {
          name: formData.name.trim(),
          scheduleType: formData.scheduleType,
          cronExpression: cronExpr,
          intervalSeconds,
          inputs: JSON.parse(formData.inputs),
          startTime: formData.startTime,
          endTime: formData.endTime,
        })
      } else {
        await client.createSchedule(workflowName, {
          name: formData.name.trim(),
          scheduleType: formData.scheduleType,
          cronExpression: cronExpr,
          intervalSeconds,
          inputs: JSON.parse(formData.inputs),
          startTime: formData.startTime,
          endTime: formData.endTime,
        })
      }

      onSuccess?.()
      onOpenChange?.(false)

      if (!isEditMode) {
        setFormData({
          name: '',
          scheduleType: 'cron',
          cronExpression: '0 * * * *',
          intervalValue: 1,
          intervalUnit: 60,
          inputs: '{}',
        })
      }
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || (isEditMode ? '更新调度失败' : '创建调度失败'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-secondary text-primary flex h-10 w-10 items-center justify-center rounded-xl">
              <Clock className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <DialogTitle>
                {isEditMode ? '编辑工作流调度' : '创建工作流调度'}
              </DialogTitle>
              <DialogDescription>
                {isEditMode ? '修改工作流的自动执行计划配置' : '设置工作流的自动执行计划,支持多种调度方式'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="border-destructive/30 bg-destructive/10 mb-4 rounded-lg border p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <ScheduleForm
            data={formData}
            onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
            cronTemplates={CRON_TEMPLATES}
            intervalUnits={INTERVAL_UNITS}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (isEditMode ? '保存中...' : '创建中...') : (isEditMode ? '保存' : '创建调度')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
