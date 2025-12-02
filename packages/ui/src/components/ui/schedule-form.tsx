'use client'

import * as React from "react"
import { Info } from "lucide-react"

import { cn } from "@sker/ui/lib/utils"
import { Label } from "./label"
import { Input } from "./input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Textarea } from "./textarea"
import { Alert, AlertDescription } from "./alert"

/**
 * ScheduleForm - 调度表单组件
 *
 * 存在即合理: 提供统一的调度配置表单
 * 优雅即简约: 组合已有表单组件，清晰的字段组织
 */

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
}

const DEFAULT_CRON_TEMPLATES: CronTemplate[] = [
  { label: '每小时', value: '0 * * * *', description: '每小时的第0分钟执行' },
  { label: '每天', value: '0 0 * * *', description: '每天午夜执行' },
  { label: '每周一', value: '0 0 * * 1', description: '每周一午夜执行' },
  { label: '每月1日', value: '0 0 1 * *', description: '每月1日午夜执行' },
  { label: '工作日', value: '0 9 * * 1-5', description: '工作日早上9点执行' },
  { label: '自定义', value: '__custom__', description: '手动输入Cron表达式' },
]

const DEFAULT_INTERVAL_UNITS: IntervalUnit[] = [
  { label: '秒', value: 1 },
  { label: '分钟', value: 60 },
  { label: '小时', value: 3600 },
  { label: '天', value: 86400 },
]

function ScheduleForm({
  data,
  onChange,
  cronTemplates = DEFAULT_CRON_TEMPLATES,
  intervalUnits = DEFAULT_INTERVAL_UNITS,
  className,
}: ScheduleFormProps) {
  const formatDate = (date?: Date): string => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDateTime = (date?: Date): string => {
    if (!date) return ''
    const dateStr = formatDate(date)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${dateStr}T${hours}:${minutes}`
  }

  const formatDisplayTime = (date?: Date): string => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  return (
    <div className={cn("space-y-6", className)} data-slot="schedule-form">
      <div className="space-y-2">
        <Label htmlFor="schedule-name">调度名称 *</Label>
        <Input
          id="schedule-name"
          placeholder="例如:每日舆情监控"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="schedule-type">调度类型 *</Label>
        <Select
          value={data.scheduleType}
          onValueChange={(value) => onChange({ scheduleType: value })}
        >
          <SelectTrigger id="schedule-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cron">Cron 表达式</SelectItem>
            <SelectItem value="interval">固定间隔</SelectItem>
            <SelectItem value="once">一次性</SelectItem>
            <SelectItem value="manual">手动触发</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.scheduleType === 'cron' && (
        <div className="border-border space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="cron-template">快速模板</Label>
            <Select
              value={data.cronExpression && cronTemplates.some(t => t.value === data.cronExpression) ? data.cronExpression : '__custom__'}
              onValueChange={(value) => {
                if (value !== '__custom__') {
                  onChange({ cronExpression: value })
                }
              }}
            >
              <SelectTrigger id="cron-template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cronTemplates.map((template) => (
                  <SelectItem key={template.value} value={template.value}>
                    {template.label} - {template.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cron-expression">Cron 表达式 *</Label>
            <Input
              id="cron-expression"
              placeholder="0 * * * *"
              value={data.cronExpression || ''}
              onChange={(e) => onChange({ cronExpression: e.target.value })}
              disabled={data.cronExpression !== '__custom__' && cronTemplates.some(t => t.value && t.value === data.cronExpression)}
            />
            <p className="text-muted-foreground text-xs">
              格式:分 时 日 月 周,例如 "0 9 * * 1-5" 表示工作日早上9点
            </p>
          </div>
        </div>
      )}

      {data.scheduleType === 'interval' && (
        <div className="border-border space-y-4 rounded-lg border p-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="interval-value">间隔时间 *</Label>
              <Input
                id="interval-value"
                type="number"
                min="1"
                value={data.intervalValue || 1}
                onChange={(e) => onChange({ intervalValue: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="interval-unit">单位</Label>
              <Select
                value={(data.intervalUnit || 60).toString()}
                onValueChange={(value) => onChange({ intervalUnit: parseInt(value) })}
              >
                <SelectTrigger id="interval-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intervalUnits.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value.toString()}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {data.scheduleType === 'once' && (
        <div className="border-border space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="start-time">执行时间 *</Label>
            <Input
              id="start-time"
              type="datetime-local"
              value={formatDateTime(data.startTime)}
              onChange={(e) => onChange({ startTime: e.target.value ? new Date(e.target.value) : undefined })}
            />
          </div>
        </div>
      )}

      {data.scheduleType !== 'manual' && data.nextRunTime && (
        <Alert>
          <Info className="text-primary size-4" strokeWidth={1.8} />
          <AlertDescription className="text-primary">
            预计下次执行时间:{formatDisplayTime(data.nextRunTime)}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="schedule-inputs">输入参数(JSON 格式)</Label>
        <Textarea
          id="schedule-inputs"
          placeholder='{"keyword": "微博", "limit": 100}'
          value={data.inputs}
          onChange={(e) => onChange({ inputs: e.target.value })}
          rows={4}
          className="font-mono"
        />
        <p className="text-muted-foreground text-xs">
          工作流执行时使用的输入参数,JSON 对象格式
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-date">开始时间(可选)</Label>
          <Input
            id="start-date"
            type="date"
            value={formatDate(data.startTime)}
            onChange={(e) => onChange({ startTime: e.target.value ? new Date(e.target.value) : undefined })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date">结束时间(可选)</Label>
          <Input
            id="end-date"
            type="date"
            value={formatDate(data.endTime)}
            onChange={(e) => onChange({ endTime: e.target.value ? new Date(e.target.value) : undefined })}
          />
        </div>
      </div>
    </div>
  )
}

export { ScheduleForm }
