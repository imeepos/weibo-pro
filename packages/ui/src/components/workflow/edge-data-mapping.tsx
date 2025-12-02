'use client'

import React from 'react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'

export interface EdgeDataMappingProps {
  fromProperty: string
  toProperty: string
  weight: number
  onFromPropertyChange: (value: string) => void
  onToPropertyChange: (value: string) => void
  onWeightChange: (value: number) => void
}

export function EdgeDataMapping({
  fromProperty,
  toProperty,
  weight,
  onFromPropertyChange,
  onToPropertyChange,
  onWeightChange
}: EdgeDataMappingProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">数据映射</Label>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="from-property" className="text-xs text-muted-foreground">
            源属性
          </Label>
          <Input
            id="from-property"
            type="text"
            value={fromProperty}
            onChange={(e) => onFromPropertyChange(e.target.value)}
            placeholder="例如: currentItem.text"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to-property" className="text-xs text-muted-foreground">
            目标属性
          </Label>
          <Input
            id="to-property"
            type="text"
            value={toProperty}
            onChange={(e) => onToPropertyChange(e.target.value)}
            placeholder="例如: content"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight" className="text-xs text-muted-foreground">
            权重
          </Label>
          <Input
            id="weight"
            type="number"
            value={weight}
            onChange={(e) => onWeightChange(parseInt(e.target.value) || 1)}
            min="1"
          />
        </div>
      </div>
    </div>
  )
}
