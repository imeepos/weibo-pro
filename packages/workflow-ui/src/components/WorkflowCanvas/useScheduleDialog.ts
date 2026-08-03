'use client'

import { useState, useEffect, useMemo } from 'react'
import { WorkflowController } from '@sker/sdk'
import type { WorkflowScheduleEntity } from '@sker/entities'
import { root } from '@sker/core'
import { WorkflowGraphAst, fromJson } from '@sker/workflow'
import type { ScheduleFormData } from '@sker/ui/components/ui/schedule-form'
import {
  createEmptyFormData,
  extractDefaultInputs,
  calculateNextRunTime,
  toIntervalSeconds,
  toCronExpression,
  validateScheduleForm,
  parseInputsJson,
} from './schedule-dialog-utils'

export interface UseScheduleDialogParams {
  workflowName: string
  schedule?: WorkflowScheduleEntity | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function useScheduleDialog({
  workflowName,
  schedule,
  open,
  onOpenChange,
  onSuccess,
}: UseScheduleDialogParams) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [formData, setFormData] = useState<ScheduleFormData>(createEmptyFormData())
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
    const nextRun = calculateNextRunTime(formData)
    setFormData(prev => ({ ...prev, nextRunTime: nextRun }))
  }, [formData.scheduleType, formData.cronExpression, formData.intervalValue, formData.intervalUnit, formData.startTime])

  const handleSubmit = async () => {
    setError('')

    const validationError = validateScheduleForm(formData)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const intervalSeconds = toIntervalSeconds(formData)
      const cronExpr = toCronExpression(formData)

      const startTime = formData.scheduleType !== 'manual'
        ? formData.startTime
        : undefined

      if (isEditMode && schedule) {
        await client.updateSchedule(schedule.id, {
          name: formData.name.trim(),
          scheduleType: formData.scheduleType,
          cronExpression: cronExpr,
          intervalSeconds,
          inputs: JSON.parse(formData.inputs),
          startTime,
          endTime: formData.endTime,
        })
      } else {
        await client.createSchedule({
          code: workflowName,
          name: formData.name.trim(),
          scheduleType: formData.scheduleType,
          cronExpression: cronExpr,
          intervalSeconds,
          inputs: JSON.parse(formData.inputs),
          startTime,
          endTime: formData.endTime,
        })
      }

      onSuccess?.()
      onOpenChange?.(false)

      if (!isEditMode) {
        setFormData(createEmptyFormData())
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
  const currentInputs = useMemo(() => parseInputsJson(formData.inputs), [formData.inputs])

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

  return {
    loading,
    error,
    formData,
    setFormData,
    workflowAst,
    showRunConfig,
    isEditMode,
    currentInputs,
    hasInputParams,
    shouldShowScheduleDialog,
    handleSubmit,
    handleRunConfigConfirm,
    handleRunConfigCancel,
    handleOpenRunConfig,
    handleDialogOpenChange,
  }
}
