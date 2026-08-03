'use client'

import * as React from "react"
import { Info } from "lucide-react"

import { Label } from "./label"
import { Input } from "./input"
import { Textarea } from "./textarea"
import { Alert, AlertDescription } from "./alert"
import { DatePicker } from "./date-picker"
import { DateRangeField } from "./date-range-field"
import { toDisplayTime, type ScheduleFormData } from "./schedule-form-types"

interface ScheduleFieldProps {
  data: ScheduleFormData
  onChange: (data: Partial<ScheduleFormData>) => void
}

export function ScheduleNotices({ data, onChange }: ScheduleFieldProps) {
  return (
    <>
      {data.scheduleType === 'continuous' && (
        <Alert>
          <Info className="text-primary size-4" strokeWidth={1.8} />
          <AlertDescription>
            持续运行模式：工作流执行完毕后会立即重新执行，形成无限循环。适用于需要持续处理任务的场景。
          </AlertDescription>
        </Alert>
      )}

      {data.scheduleType !== 'manual' && data.scheduleType !== 'continuous' && data.nextRunTime && (
        <Alert>
          <Info className="text-primary size-4" strokeWidth={1.8} />
          <AlertDescription className="text-primary">
            预计下次执行时间:{toDisplayTime(data.nextRunTime)}
          </AlertDescription>
        </Alert>
      )}

      {data.scheduleType === 'continuous' && (
        <Alert>
          <Info className="text-primary size-4" strokeWidth={1.8} />
          <AlertDescription className="text-primary">
            启用后将立即开始执行，并在每次执行完毕后自动开始下一次
          </AlertDescription>
        </Alert>
      )}

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
    </>
  )
}

export function ScheduleInputsField({ data, onChange }: ScheduleFieldProps) {
  return (
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
  )
}

export function ScheduleDateRangeField({ data, onChange }: ScheduleFieldProps) {
  return (
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
  )
}
