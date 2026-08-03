'use client'

import * as React from "react"

import { cn } from "@sker/ui/lib/utils"
import { Label } from "./label"
import { Input } from "./input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import {
  DEFAULT_CRON_TEMPLATES,
  DEFAULT_INTERVAL_UNITS,
  type ScheduleFormProps,
} from "./schedule-form-types"
import {
  CronScheduleFields,
  IntervalScheduleFields,
  OnceScheduleFields,
} from "./schedule-form-fields"
import {
  ScheduleDateRangeField,
  ScheduleInputsField,
  ScheduleNotices,
} from "./schedule-form-extra-fields"

export type {
  CronTemplate,
  IntervalUnit,
  ScheduleFormData,
  ScheduleFormProps,
} from './schedule-form-types'

/**
 * ScheduleForm - 调度表单组件
 *
 * 存在即合理: 统一的调度配置表单，每个字段服务于明确的业务目的
 * 优雅即简约: 组合已有UI组件，代码即文档
 */
function ScheduleForm({
  data,
  onChange,
  cronTemplates = DEFAULT_CRON_TEMPLATES,
  intervalUnits = DEFAULT_INTERVAL_UNITS,
  className,
  showInputsField = true,
}: ScheduleFormProps) {
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
            <SelectItem value="continuous">持续运行</SelectItem>
            <SelectItem value="manual">手动触发</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.scheduleType === 'cron' && (
        <CronScheduleFields data={data} onChange={onChange} cronTemplates={cronTemplates} />
      )}

      {data.scheduleType === 'interval' && (
        <IntervalScheduleFields data={data} onChange={onChange} intervalUnits={intervalUnits} />
      )}

      {data.scheduleType === 'once' && (
        <OnceScheduleFields data={data} onChange={onChange} />
      )}

      <ScheduleNotices data={data} onChange={onChange} />

      {showInputsField && <ScheduleInputsField data={data} onChange={onChange} />}

      {(data.scheduleType === 'cron' || data.scheduleType === 'interval') && (
        <ScheduleDateRangeField data={data} onChange={onChange} />
      )}
    </div>
  )
}

export { ScheduleForm }
