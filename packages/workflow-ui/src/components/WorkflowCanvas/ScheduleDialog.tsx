'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Settings } from 'lucide-react'
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
import { Button } from '@sker/ui/components/ui/button'
import {
  ScheduleForm,
  type ScheduleFormData,
  type CronTemplate,
  type IntervalUnit,
} from '@sker/ui/components/ui/schedule-form'
import { WorkflowGraphAst, fromJson, getInputMetadata, resolveConstructor } from '@sker/workflow'
import { CronExpressionParser } from 'cron-parser'
import { RunConfigDialog } from './RunConfigDialog'
import { cn } from '@sker/ui/lib/utils'

/**
 * 调度对话框
 *
 * 存在即合理:
 * - 创建工作流调度任务
 * - 编辑现有调度配置
 * - 支持多种调度类型(Cron/间隔/一次性/手动)
 * - 自动计算下次执行时间
 * - 通过 RunConfigDialog 配置输入参数
 *
 * 优雅设计:
 * - 使用 @sker/ui Dialog 和 ScheduleForm 组件
 * - 复用 RunConfigDialog 处理参数配置
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
  const [showRunConfig, setShowRunConfig] = useState(false)

  const client = root.get<WorkflowController>(WorkflowController)
  const isEditMode = !!schedule

  // 获取工作流 AST
  useEffect(() => {
    const fetchWorkflow = async () => {
      if (!open || isEditMode) return

      try {
        const workflow = await client.getWorkflow({ name: workflowName })
        if (workflow) {
          const ast = fromJson<WorkflowGraphAst>(workflow)
          setWorkflowAst(ast)

          // 提取默认输入值
          const defaultInputs = extractDefaultInputs(ast)
          const inputsJson = Object.keys(defaultInputs).length > 0
            ? JSON.stringify(defaultInputs, null, 2)
            : '{}'

          setFormData(prev => ({ ...prev, inputs: inputsJson }))
        }
      } catch (error) {
        console.error('获取工作流失败:', error)
      }
    }

    fetchWorkflow()
  }, [open, workflowName, isEditMode])

  // 编辑模式下初始化表单数据
  useEffect(() => {
    if (schedule) {
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
    }
  }, [schedule])

  useEffect(() => {
    calculateNextRunTime()
  }, [formData.scheduleType, formData.cronExpression, formData.intervalValue, formData.intervalUnit, formData.startTime])

  const calculateNextRunTime = async () => {
    try {
      let calculatedNextRun: Date | undefined

      if (formData.scheduleType === 'once' && formData.startTime) {
        calculatedNextRun = formData.startTime
      } else if (formData.scheduleType === 'cron' && formData.cronExpression) {
        if (formData.cronExpression === '__custom__') {
          calculatedNextRun = undefined
        } else {
          try {
            const interval = CronExpressionParser.parse(formData.cronExpression, {
              currentDate: formData.startTime || new Date(),
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

    if ((formData.scheduleType === 'cron' || formData.scheduleType === 'interval')) {
      if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
        setError('结束时间必须晚于开始时间')
        return false
      }
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

      const startTime = formData.scheduleType !== 'manual'
        ? formData.startTime
        : undefined

      // 将 Date 对象转换为 ISO 字符串用于网络传输
      const startTimeIso = startTime?.toISOString()
      const endTimeIso = formData.endTime?.toISOString()

      if (isEditMode && schedule) {
        await client.updateSchedule(schedule.id, {
          name: formData.name.trim(),
          scheduleType: formData.scheduleType,
          cronExpression: cronExpr,
          intervalSeconds,
          inputs: JSON.parse(formData.inputs),
          startTime: startTimeIso,
          endTime: endTimeIso,
        })
      } else {
        await client.createSchedule({
          code: workflowName,
          name: formData.name.trim(),
          scheduleType: formData.scheduleType,
          cronExpression: cronExpr,
          intervalSeconds,
          inputs: JSON.parse(formData.inputs),
          startTime: startTimeIso,
          endTime: endTimeIso,
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

  const handleRunConfigConfirm = (inputs: Record<string, unknown>) => {
    setFormData(prev => ({ ...prev, inputs: JSON.stringify(inputs, null, 2) }))
    setShowRunConfig(false)
  }

  const handleRunConfigCancel = () => {
    setShowRunConfig(false)
  }

  const handleOpenRunConfig = () => {
    if (!workflowAst) {
      setError('请先保存工作流配置')
      return
    }
    setShowRunConfig(true)
  }

  // 解析当前 inputs
  const currentInputs = useMemo(() => {
    try {
      return JSON.parse(formData.inputs)
    } catch {
      return {}
    }
  }, [formData.inputs])

  // 检查是否有配置参数
  const hasInputParams = useMemo(() => {
    if (!workflowAst) return false
    const entryNodes = workflowAst.entryNodeIds?.length
      ? workflowAst.nodes.filter((node) => workflowAst.entryNodeIds.includes(node.id))
      : workflowAst.nodes.filter((node) => !workflowAst.edges.some((edge: any) => edge.to === node.id))
    return entryNodes.length > 0
  }, [workflowAst])

  // 当 RunConfigDialog 打开时，完全隐藏 ScheduleDialog
  const shouldShowScheduleDialog = open && !showRunConfig

  // 处理 Dialog 关闭事件
  const handleDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowRunConfig(false)
    }
    // 只有当不是因为打开 RunConfigDialog 而关闭时，才通知父组件
    if (newOpen || !showRunConfig) {
      onOpenChange?.(newOpen)
    }
  }

  return (
    <>
      <Dialog open={shouldShowScheduleDialog} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-w-2xl flex flex-col p-0"
          style={{ maxHeight: '90vh' }}
        >
          <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
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

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
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
              showInputsField={!hasInputParams}
            />

            {/* 参数配置按钮 */}
            {hasInputParams && (
              <div className="mt-6 flex items-center justify-between rounded-lg border border-border/50 p-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" strokeWidth={1.8} />
                  <div>
                    <h3 className="text-sm font-semibold">运行参数</h3>
                    <p className="text-muted-foreground text-xs">配置工作流入口节点的输入参数</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleOpenRunConfig}>
                  配置参数
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
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

      {/* 复用 RunConfigDialog 进行参数配置 */}
      {showRunConfig && workflowAst && (
        <RunConfigDialog
          visible={showRunConfig}
          workflow={workflowAst}
          defaultInputs={currentInputs}
          onConfirm={handleRunConfigConfirm}
          onCancel={handleRunConfigCancel}
        />
      )}
    </>
  )
}

/**
 * 提取工作流入口节点的默认输入值（只提取 @Input 装饰器标记的属性）
 */
function extractDefaultInputs(workflow: WorkflowGraphAst): Record<string, unknown> {
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

function useMemo<T>(factory: () => T, deps: any[]): T {
  return React.useMemo(factory, deps)
}
