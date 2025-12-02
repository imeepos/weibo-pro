'use client'

import React from 'react'
import { EdgeMode } from './types'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { cn } from '@sker/ui/lib/utils'

export interface EdgeModeOption {
  key: EdgeMode
  icon: string
  label: string
  description: string
  scenario: string
}

export interface EdgeModeSelectorProps {
  value: EdgeMode
  options: EdgeModeOption[]
  onChange: (mode: EdgeMode) => void
}

export function EdgeModeSelector({
  value,
  options,
  onChange
}: EdgeModeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">模式选择</Label>
      <RadioGroup value={value} onValueChange={(val) => onChange(val as EdgeMode)}>
        <div className="space-y-2">
          {options.map(({ key, icon, label, description, scenario }) => (
            <label
              key={key}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all',
                value === key
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-accent/50'
              )}
            >
              <RadioGroupItem value={key} className="mt-1" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className="font-medium">{label}</span>
                  <span className="text-sm text-muted-foreground">{description}</span>
                </div>
                <p className="text-xs text-muted-foreground">适用：{scenario}</p>
              </div>
            </label>
          ))}
        </div>
      </RadioGroup>
    </div>
  )
}
