'use client'

import * as React from "react"
import { AlertCircle } from "lucide-react"

import { cn } from "@sker/ui/lib/utils"
import { Label } from "./label"
import { Input } from "./input"
import { DatePicker } from "./date-picker"

/**
 * DateRangeField - 时间范围选择字段
 *
 * 存在即合理: 封装开始/结束时间选择逻辑，防止时间倒置
 * 优雅即简约: 自动验证，无需外部处理边界条件
 * 性能即艺术: 组件内部优化，避免不必要的重渲染
 */

export interface DateRangeFieldProps {
  startDate?: Date
  endDate?: Date
  onStartDateChange?: (date: Date | undefined) => void
  onEndDateChange?: (date: Date | undefined) => void
  startLabel?: string
  endLabel?: string
  startPlaceholder?: string
  endPlaceholder?: string
  startDescription?: string
  endDescription?: string
  withTime?: boolean
  disabled?: boolean
  className?: string
  minStartDate?: Date
  maxEndDate?: Date
  required?: boolean
}

function DateRangeField({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = "开始时间",
  endLabel = "结束时间",
  startPlaceholder = "选择开始日期",
  endPlaceholder = "选择结束日期",
  startDescription,
  endDescription,
  withTime = false,
  disabled = false,
  className,
  minStartDate,
  maxEndDate,
  required = false,
}: DateRangeFieldProps) {
  const [validationError, setValidationError] = React.useState<string>()

  const toTimeInput = (date?: Date): string =>
    date?.toISOString().slice(11, 16) ?? ''

  const validateRange = React.useCallback((start?: Date, end?: Date) => {
    if (!start || !end) {
      setValidationError(undefined)
      return true
    }

    if (end <= start) {
      setValidationError('结束时间必须晚于开始时间')
      return false
    }

    setValidationError(undefined)
    return true
  }, [])

  const handleStartDateChange = (date: Date | undefined) => {
    if (date && withTime && startDate) {
      date.setHours(startDate.getHours(), startDate.getMinutes())
    }
    onStartDateChange?.(date)
    validateRange(date, endDate)
  }

  const handleEndDateChange = (date: Date | undefined) => {
    if (date && withTime && endDate) {
      date.setHours(endDate.getHours(), endDate.getMinutes())
    }

    if (date && startDate && date <= startDate) {
      setValidationError('结束时间必须晚于开始时间')
      return
    }

    onEndDateChange?.(date)
    validateRange(startDate, date)
  }

  const handleStartTimeChange = (time: string) => {
    if (!time) return
    const [hours = '0', minutes = '0'] = time.split(':')
    const newDate = startDate ? new Date(startDate) : new Date()
    newDate.setHours(parseInt(hours), parseInt(minutes))
    onStartDateChange?.(newDate)
    validateRange(newDate, endDate)
  }

  const handleEndTimeChange = (time: string) => {
    if (!time) return
    const [hours = '0', minutes = '0'] = time.split(':')
    const newDate = endDate ? new Date(endDate) : new Date()
    newDate.setHours(parseInt(hours), parseInt(minutes))

    if (startDate && newDate <= startDate) {
      setValidationError('结束时间必须晚于开始时间')
      return
    }

    onEndDateChange?.(newDate)
    validateRange(startDate, newDate)
  }

  React.useEffect(() => {
    validateRange(startDate, endDate)
  }, [startDate, endDate, validateRange])

  return (
    <div className={cn("space-y-4", className)} data-slot="date-range-field">
      <div className="grid grid-cols-2 gap-4">
        {/* 开始时间 */}
        <div className="space-y-2">
          <Label htmlFor="start-date">
            {startLabel} {required && <span className="text-destructive">*</span>}
          </Label>
          {withTime ? (
            <div className="flex items-center gap-2">
              <DatePicker
                date={startDate}
                onSelect={handleStartDateChange}
                placeholder={startPlaceholder}
                disabled={disabled}
                minDate={minStartDate}
                maxDate={endDate || maxEndDate}
                className="flex-1"
              />
              <Input
                type="time"
                value={startDate ? toTimeInput(startDate) : ''}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                disabled={disabled || !startDate}
                className="w-32"
              />
            </div>
          ) : (
            <DatePicker
              date={startDate}
              onSelect={handleStartDateChange}
              placeholder={startPlaceholder}
              disabled={disabled}
              minDate={minStartDate}
              maxDate={endDate || maxEndDate}
            />
          )}
          {startDescription && (
            <p className="text-muted-foreground text-xs">{startDescription}</p>
          )}
        </div>

        {/* 结束时间 */}
        <div className="space-y-2">
          <Label htmlFor="end-date">
            {endLabel} {required && <span className="text-destructive">*</span>}
          </Label>
          {withTime ? (
            <div className="flex items-center gap-2">
              <DatePicker
                date={endDate}
                onSelect={handleEndDateChange}
                placeholder={endPlaceholder}
                disabled={disabled}
                minDate={startDate}
                maxDate={maxEndDate}
                className="flex-1"
              />
              <Input
                type="time"
                value={endDate ? toTimeInput(endDate) : ''}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                disabled={disabled || !endDate}
                className="w-32"
              />
            </div>
          ) : (
            <DatePicker
              date={endDate}
              onSelect={handleEndDateChange}
              placeholder={endPlaceholder}
              disabled={disabled}
              minDate={startDate}
              maxDate={maxEndDate}
            />
          )}
          {endDescription && (
            <p className="text-muted-foreground text-xs">{endDescription}</p>
          )}
        </div>
      </div>

      {/* 验证错误提示 */}
      {validationError && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="size-4" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  )
}

export { DateRangeField }
