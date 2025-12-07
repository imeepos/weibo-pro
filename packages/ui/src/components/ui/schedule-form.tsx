'use client'

import * as React from "react"
import { Info } from "lucide-react"

import { cn } from "@sker/ui/lib/utils"
import { Label } from "./label"
import { Input } from "./input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Textarea } from "./textarea"
import { Alert, AlertDescription } from "./alert"
import { Card, CardContent } from "./card"
import { DatePicker } from "./date-picker"
import { DateRangeField } from "./date-range-field"

/**
 * ScheduleForm - 调度表单组件
 *
 * 存在即合理: 统一的调度配置表单，每个字段服务于明确的业务目的
 * 优雅即简约: 组合已有UI组件，代码即文档
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
  /**
   * 将 Date 转换为本地时间的 datetime-local input 格式 (YYYY-MM-DDTHH:mm)
   * 不使用 toISOString() 以避免时区转换问题
   */
  const toDateTimeInput = (date?: Date): string => {
    if (!date) return ''

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const toDisplayTime = (date?: Date): string =>
    date?.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).replace(/\//g, '-') ?? ''

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
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cron-template">快速模板</Label>
              <Select
                value={data.cronExpression && cronTemplates.some(t => t.value === data.cronExpression) ? data.cronExpression : '__custom__'}
                onValueChange={(value) => {
                  onChange({ cronExpression: value })
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
                value={data.cronExpression === '__custom__' ? '' : (data.cronExpression || '')}
                onChange={(e) => onChange({ cronExpression: e.target.value })}
                disabled={data.cronExpression !== '__custom__' && cronTemplates.some(t => t.value && t.value !== '__custom__' && t.value === data.cronExpression)}
              />
              <p className="text-muted-foreground text-xs">
                格式:分 时 日 月 周,例如 "0 9 * * 1-5" 表示工作日早上9点
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {data.scheduleType === 'interval' && (
        <Card>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {data.scheduleType === 'once' && (
        <Card>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="start-time">执行时间 *</Label>
              <div className="flex items-center gap-2">
                <DatePicker
                  date={data.startTime}
                  onSelect={(date) => {
                    if (date) {
                      const current = data.startTime || new Date()
                      date.setHours(current.getHours(), current.getMinutes())
                    }
                    onChange({ startTime: date })
                  }}
                  placeholder="选择日期"
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={data.startTime ? toDateTimeInput(data.startTime).split('T')[1] : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [hours, minutes] = e.target.value.split(':')
                      const newDate = data.startTime ? new Date(data.startTime) : new Date()
                      newDate.setHours(parseInt(hours), parseInt(minutes))
                      onChange({ startTime: newDate })
                    }
                  }}
                  className="w-32"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.scheduleType !== 'manual' && data.nextRunTime && (
        <Alert>
          <Info className="text-primary size-4" strokeWidth={1.8} />
          <AlertDescription className="text-primary">
            预计下次执行时间:{toDisplayTime(data.nextRunTime)}
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

      {/* 时间范围控制 - 根据调度类型显示不同字段 */}
      {data.scheduleType === 'manual' && (
        <div className="space-y-2">
          <Label htmlFor="expiry-date">有效期至(可选)</Label>
          <DatePicker
            date={data.endTime}
            onSelect={(date) => onChange({ endTime: date })}
            placeholder="选择过期日期"
          />
          <p className="text-muted-foreground text-xs">
            超过此时间后将无法手动触发此调度
          </p>
        </div>
      )}

      {(data.scheduleType === 'cron' || data.scheduleType === 'interval') && (
        <DateRangeField
          startDate={data.startTime}
          endDate={data.endTime}
          onStartDateChange={(date) => onChange({ startTime: date })}
          onEndDateChange={(date) => onChange({ endTime: date })}
          startLabel="开始时间(可选)"
          endLabel="结束时间(可选)"
          startPlaceholder="选择开始日期"
          endPlaceholder="选择结束日期"
          startDescription="从此时间开始执行调度"
          endDescription="到此时间后停止调度"
        />
      )}
    </div>
  )
}

export { ScheduleForm }
