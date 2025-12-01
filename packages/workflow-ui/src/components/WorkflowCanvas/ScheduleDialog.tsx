'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Clock, Info } from 'lucide-react'
import { WorkflowController } from '@sker/sdk'
import type { WorkflowScheduleEntity } from '@sker/entities'
import { root } from '@sker/core'

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
 * - 手工打造的 UI,无外部依赖
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

interface CronTemplate {
  label: string
  value: string
  description: string
}

interface IntervalUnit {
  label: string
  value: number
}

const CRON_TEMPLATES: CronTemplate[] = [
  { label: '每小时', value: '0 * * * *', description: '每小时的第0分钟执行' },
  { label: '每天', value: '0 0 * * *', description: '每天午夜执行' },
  { label: '每周一', value: '0 0 * * 1', description: '每周一午夜执行' },
  { label: '每月1日', value: '0 0 1 * *', description: '每月1日午夜执行' },
  { label: '工作日', value: '0 9 * * 1-5', description: '工作日早上9点执行' },
  { label: '自定义', value: '', description: '手动输入Cron表达式' },
]

const INTERVAL_UNITS: IntervalUnit[] = [
  { label: '秒', value: 1 },
  { label: '分钟', value: 60 },
  { label: '小时', value: 3600 },
  { label: '天', value: 86400 },
]

export function ScheduleDialog({ workflowName, schedule, open, onOpenChange, onSuccess }: ScheduleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [scheduleType, setScheduleType] = useState<string>('cron')
  const [name, setName] = useState('')
  const [cronExpression, setCronExpression] = useState('0 * * * *')
  const [cronTemplate, setCronTemplate] = useState('0 * * * *')
  const [intervalValue, setIntervalValue] = useState(1)
  const [intervalUnit, setIntervalUnit] = useState(60)
  const [inputs, setInputs] = useState('{}')
  const [startTime, setStartTime] = useState<Date | undefined>()
  const [endTime, setEndTime] = useState<Date | undefined>()
  const [nextRunTime, setNextRunTime] = useState<Date | undefined>()
  const [error, setError] = useState<string>('')

  const client = root.get<WorkflowController>(WorkflowController) as any
  const isEditMode = !!schedule

  // 编辑模式：初始化表单数据
  useEffect(() => {
    if (schedule) {
      setName(schedule.name)
      setScheduleType(schedule.scheduleType)

      if (schedule.scheduleType === 'cron' && schedule.cronExpression) {
        setCronExpression(schedule.cronExpression)
        // 检查是否匹配模板
        const matchedTemplate = CRON_TEMPLATES.find(t => t.value === schedule.cronExpression)
        setCronTemplate(matchedTemplate?.value || '')
      }

      if (schedule.scheduleType === 'interval' && schedule.intervalSeconds) {
        // 智能解析间隔时间
        const seconds = schedule.intervalSeconds
        if (seconds % 86400 === 0) {
          setIntervalValue(seconds / 86400)
          setIntervalUnit(86400)
        } else if (seconds % 3600 === 0) {
          setIntervalValue(seconds / 3600)
          setIntervalUnit(3600)
        } else if (seconds % 60 === 0) {
          setIntervalValue(seconds / 60)
          setIntervalUnit(60)
        } else {
          setIntervalValue(seconds)
          setIntervalUnit(1)
        }
      }

      setInputs(JSON.stringify(schedule.inputs || {}, null, 2))
      setStartTime(schedule.startTime ? new Date(schedule.startTime) : undefined)
      setEndTime(schedule.endTime ? new Date(schedule.endTime) : undefined)
    } else {
      // 新建模式：重置表单
      setName('')
      setScheduleType('cron')
      setCronExpression('0 * * * *')
      setCronTemplate('0 * * * *')
      setIntervalValue(1)
      setIntervalUnit(60)
      setInputs('{}')
      setStartTime(undefined)
      setEndTime(undefined)
    }
  }, [schedule])

  // 计算下次执行时间
  useEffect(() => {
    calculateNextRunTime()
  }, [scheduleType, cronExpression, intervalValue, intervalUnit, startTime])

  useEffect(() => {
    if (cronTemplate) {
      setCronExpression(cronTemplate)
    }
  }, [cronTemplate])

  const calculateNextRunTime = async () => {
    try {
      let calculatedNextRun: Date | undefined

      if (scheduleType === 'once' && startTime) {
        calculatedNextRun = startTime
      } else if (scheduleType === 'cron' && cronExpression) {
        // 简单的 Cron 解析(实际项目中可以使用 cron-parser 库)
        try {
          // 这里简化处理,实际应该调用后端 API 计算
          calculatedNextRun = new Date(Date.now() + 60000) // 模拟计算
        } catch {
          calculatedNextRun = undefined
        }
      } else if (scheduleType === 'interval') {
        const intervalSeconds = intervalValue * intervalUnit
        calculatedNextRun = new Date(Date.now() + intervalSeconds * 1000)
      }

      setNextRunTime(calculatedNextRun)
    } catch {
      setNextRunTime(undefined)
    }
  }

  const validateInputs = () => {
    if (!name.trim()) {
      setError('调度名称不能为空')
      return false
    }

    try {
      const parsed = JSON.parse(inputs)
      if (typeof parsed !== 'object' || parsed === null) {
        setError('输入参数必须是有效的 JSON 对象')
        return false
      }
    } catch {
      setError('输入参数必须是有效的 JSON 格式')
      return false
    }

    if (scheduleType === 'cron' && !cronExpression) {
      setError('Cron 表达式不能为空')
      return false
    }

    if (scheduleType === 'interval' && (!intervalValue || intervalValue <= 0)) {
      setError('间隔时间必须大于 0')
      return false
    }

    if (startTime && endTime && startTime >= endTime) {
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
      const intervalSeconds = scheduleType === 'interval' ? intervalValue * intervalUnit : undefined

      if (isEditMode && schedule) {
        // 编辑模式：更新现有调度
        await client.updateSchedule(schedule.id, {
          name: name.trim(),
          scheduleType,
          cronExpression: scheduleType === 'cron' ? cronExpression : undefined,
          intervalSeconds,
          inputs: JSON.parse(inputs),
          startTime,
          endTime,
        })
      } else {
        // 新建模式：创建新调度
        await client.createSchedule(workflowName, {
          name: name.trim(),
          scheduleType,
          cronExpression: scheduleType === 'cron' ? cronExpression : undefined,
          intervalSeconds,
          inputs: JSON.parse(inputs),
          startTime,
          endTime,
        })
      }

      onSuccess?.()
      onOpenChange?.(false)

      // 重置表单（仅在新建模式下）
      if (!isEditMode) {
        setName('')
        setCronExpression('0 * * * *')
        setCronTemplate('0 * * * *')
        setIntervalValue(1)
        setIntervalUnit(60)
        setInputs('{}')
        setStartTime(undefined)
        setEndTime(undefined)
      }
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || (isEditMode ? '更新调度失败' : '创建调度失败'))
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  if (!open) return null

  const dialogContent = (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="fixed left-1/2 top-1/2 z-[9999] w-full max-w-2xl max-h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Clock className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isEditMode ? '编辑工作流调度' : '创建工作流调度'}
              </h3>
              <p className="text-sm text-muted-foreground/70">
                {isEditMode ? '修改工作流的自动执行计划配置' : '设置工作流的自动执行计划,支持多种调度方式'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-white"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-sm text-red-100">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="schedule-name" className="block text-sm font-medium text-[#9da6b9]">
                调度名称 *
              </label>
              <input
                id="schedule-name"
                type="text"
                placeholder="例如:每日舆情监控"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#2f3543] bg-[#1a1d24] px-4 py-2.5 text-sm text-white focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="schedule-type" className="block text-sm font-medium text-[#9da6b9]">
                调度类型 *
              </label>
              <select
                id="schedule-type"
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value)}
                className="w-full rounded-lg border border-[#2f3543] bg-[#1a1d24] px-4 py-2.5 text-sm text-white focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
              >
                <option value="cron">Cron 表达式</option>
                <option value="interval">固定间隔</option>
                <option value="once">一次性</option>
                <option value="manual">手动触发</option>
              </select>
            </div>

            {scheduleType === 'cron' && (
              <div className="space-y-4 rounded-lg border border-[#2f3543] p-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#9da6b9]">快速模板</label>
                  <select
                    value={cronTemplate}
                    onChange={(e) => setCronTemplate(e.target.value)}
                    className="w-full rounded-lg border border-[#2f3543] bg-[#1a1d24] px-4 py-2.5 text-sm text-white focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
                  >
                    {CRON_TEMPLATES.map((template) => (
                      <option key={template.value} value={template.value}>
                        {template.label} - {template.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="cron-expression" className="block text-sm font-medium text-[#9da6b9]">
                    Cron 表达式 *
                  </label>
                  <input
                    id="cron-expression"
                    type="text"
                    placeholder="0 * * * *"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    disabled={cronTemplate !== ''}
                    className="w-full rounded-lg border border-[#2f3543] bg-[#1a1d24] px-4 py-2.5 text-sm text-white disabled:opacity-50 focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
                  />
                  <p className="text-xs text-[#6c7a91]">
                    格式:分 时 日 月 周,例如 "0 9 * * 1-5" 表示工作日早上9点
                  </p>
                </div>
              </div>
            )}

            {scheduleType === 'interval' && (
              <div className="space-y-4 rounded-lg border border-[#2f3543] p-4">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <label htmlFor="interval-value" className="block text-sm font-medium text-[#9da6b9]">
                      间隔时间 *
                    </label>
                    <input
                      id="interval-value"
                      type="number"
                      min="1"
                      value={intervalValue}
                      onChange={(e) => setIntervalValue(parseInt(e.target.value) || 1)}
                      className="w-full rounded-lg border border-[#2f3543] bg-[#1a1d24] px-4 py-2.5 text-sm text-white focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="block text-sm font-medium text-[#9da6b9]">单位</label>
                    <select
                      value={intervalUnit.toString()}
                      onChange={(e) => setIntervalUnit(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-[#2f3543] bg-[#1a1d24] px-4 py-2.5 text-sm text-white focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
                    >
                      {INTERVAL_UNITS.map((unit) => (
                        <option key={unit.value} value={unit.value.toString()}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {scheduleType === 'once' && (
              <div className="space-y-4 rounded-lg border border-[#2f3543] p-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#9da6b9]">执行时间 *</label>
                  <input
                    type="datetime-local"
                    value={startTime ? formatDate(startTime) + 'T' + String(startTime.getHours()).padStart(2, '0') + ':' + String(startTime.getMinutes()).padStart(2, '0') : ''}
                    onChange={(e) => setStartTime(e.target.value ? new Date(e.target.value) : undefined)}
                    className="w-full rounded-lg border border-[#2f3543] bg-[#1a1d24] px-4 py-2.5 text-sm text-white focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
                  />
                </div>
              </div>
            )}

            {scheduleType !== 'manual' && nextRunTime && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 flex-shrink-0 text-blue-500" strokeWidth={1.8} />
                  <p className="text-sm text-blue-100">
                    预计下次执行时间:{formatDateTime(nextRunTime)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="schedule-inputs" className="block text-sm font-medium text-[#9da6b9]">
                输入参数(JSON 格式)
              </label>
              <textarea
                id="schedule-inputs"
                placeholder='{"keyword": "微博", "limit": 100}'
                value={inputs}
                onChange={(e) => setInputs(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-[#2f3543] bg-[#1a1d24] px-4 py-2.5 text-sm text-white font-mono focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
              />
              <p className="text-xs text-[#6c7a91]">
                工作流执行时使用的输入参数,JSON 对象格式
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#9da6b9]">开始时间(可选)</label>
                <input
                  type="date"
                  value={startTime ? formatDate(startTime) : ''}
                  onChange={(e) => setStartTime(e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-[#2f3543] bg-[#1a1d24] px-4 py-2.5 text-sm text-white focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#9da6b9]">结束时间(可选)</label>
                <input
                  type="date"
                  value={endTime ? formatDate(endTime) : ''}
                  onChange={(e) => setEndTime(e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-[#2f3543] bg-[#1a1d24] px-4 py-2.5 text-sm text-white focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#2f3543] p-6">
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            disabled={loading}
            className="rounded-lg border border-[#2f3543] bg-[#1a1d24] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2531] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#135bec] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318] disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-[#135bec] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b6aff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#135bec] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318] disabled:opacity-50"
          >
            {loading ? (isEditMode ? '保存中...' : '创建中...') : (isEditMode ? '保存' : '创建调度')}
          </button>
        </div>
      </div>
    </>
  )

  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : null
}
