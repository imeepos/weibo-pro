'use client'

import * as React from "react"

import { Label } from "./label"
import { Input } from "./input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Card, CardContent } from "./card"
import { DatePicker } from "./date-picker"
import {
  toDateTimeInput,
  type CronTemplate,
  type IntervalUnit,
  type ScheduleFormData,
} from "./schedule-form-types"

interface ScheduleFieldProps {
  data: ScheduleFormData
  onChange: (data: Partial<ScheduleFormData>) => void
}

export function CronScheduleFields({
  data,
  onChange,
  cronTemplates,
}: ScheduleFieldProps & { cronTemplates: CronTemplate[] }) {
  return (
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
            格式:分 时 日 月 周,例如 &quot;0 9 * * 1-5&quot; 表示工作日早上9点
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function IntervalScheduleFields({
  data,
  onChange,
  intervalUnits,
}: ScheduleFieldProps & { intervalUnits: IntervalUnit[] }) {
  return (
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
  )
}

export function OnceScheduleFields({ data, onChange }: ScheduleFieldProps) {
  return (
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
                  const [hours = '0', minutes = '0'] = e.target.value.split(':')
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
  )
}
