'use client'

import React, { useState } from 'react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { cn } from '@sker/ui/lib/utils'

export interface EdgeConditionConfigProps {
  condition?: {
    property: string
    value: any
  }
  onConditionChange: (condition: { property: string; value: any } | undefined) => void
}

type ValueType = 'string' | 'number' | 'boolean' | 'null'

export function EdgeConditionConfig({
  condition,
  onConditionChange
}: EdgeConditionConfigProps) {
  const [enabled, setEnabled] = useState(!!condition)
  const [property, setProperty] = useState(condition?.property || '')
  const [valueType, setValueType] = useState<ValueType>('string')
  const [valueInput, setValueInput] = useState(
    condition?.value !== undefined ? String(condition.value) : ''
  )

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked)
    if (!checked) {
      onConditionChange(undefined)
    } else {
      onConditionChange({
        property,
        value: parseValue(valueInput, valueType)
      })
    }
  }

  const handlePropertyChange = (value: string) => {
    setProperty(value)
    if (enabled) {
      onConditionChange({
        property: value,
        value: parseValue(valueInput, valueType)
      })
    }
  }

  const handleValueTypeChange = (type: ValueType) => {
    setValueType(type)
    if (enabled) {
      onConditionChange({
        property,
        value: parseValue(valueInput, type)
      })
    }
  }

  const handleValueInputChange = (value: string) => {
    setValueInput(value)
    if (enabled) {
      onConditionChange({
        property,
        value: parseValue(value, valueType)
      })
    }
  }

  const parseValue = (input: string, type: ValueType): any => {
    switch (type) {
      case 'string':
        return input
      case 'number':
        const num = parseFloat(input)
        return isNaN(num) ? 0 : num
      case 'boolean':
        return input.toLowerCase() === 'true'
      case 'null':
        return null
      default:
        return input
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="condition-edge"
          checked={enabled}
          onCheckedChange={handleEnabledChange}
        />
        <Label htmlFor="condition-edge" className="text-sm font-medium cursor-pointer">
          ⚡ 条件边
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">
        仅当源节点的指定属性等于期望值时，才传递数据到目标节点
      </p>

      {enabled && (
        <div className="space-y-3 border-t border-blue-500/20 pt-3">
          <div className="space-y-2">
            <Label htmlFor="condition-property" className="text-xs text-muted-foreground">
              条件属性名 <span className="text-blue-500">*</span>
            </Label>
            <Input
              id="condition-property"
              type="text"
              value={property}
              onChange={(e) => handlePropertyChange(e.target.value)}
              placeholder="例如: status"
              className={cn(
                'focus-visible:border-blue-500',
                'focus-visible:ring-blue-500/50'
              )}
            />
            <p className="text-xs text-muted-foreground">
              从源节点获取此属性的值进行判断
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="value-type" className="text-xs text-muted-foreground">
                值类型
              </Label>
              <Select value={valueType} onValueChange={handleValueTypeChange}>
                <SelectTrigger id="value-type" className={cn(
                  'focus:border-blue-500',
                  'focus:ring-blue-500/50'
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">字符串</SelectItem>
                  <SelectItem value="number">数字</SelectItem>
                  <SelectItem value="boolean">布尔值</SelectItem>
                  <SelectItem value="null">null</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition-value" className="text-xs text-muted-foreground">
                期望值 <span className="text-blue-500">*</span>
              </Label>
              {valueType === 'boolean' ? (
                <Select
                  value={valueInput || 'true'}
                  onValueChange={handleValueInputChange}
                >
                  <SelectTrigger id="condition-value" className={cn(
                    'focus:border-blue-500',
                    'focus:ring-blue-500/50'
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              ) : valueType === 'null' ? (
                <Input
                  id="condition-value"
                  type="text"
                  value="null"
                  disabled
                  className={cn(
                    'focus-visible:border-blue-500',
                    'focus-visible:ring-blue-500/50'
                  )}
                />
              ) : (
                <Input
                  id="condition-value"
                  type={valueType === 'number' ? 'number' : 'text'}
                  value={valueInput}
                  onChange={(e) => handleValueInputChange(e.target.value)}
                  placeholder={valueType === 'number' ? '例如: 1' : '例如: success'}
                  className={cn(
                    'focus-visible:border-blue-500',
                    'focus-visible:ring-blue-500/50'
                  )}
                />
              )}
            </div>
          </div>

          <div className="rounded-md bg-blue-500/10 p-3">
            <p className="text-xs leading-relaxed text-blue-900 dark:text-blue-200">
              💡 <strong>使用示例：</strong>
              <br />
              • 状态路由：status=success 走成功分支，status=error 走失败分支
              <br />
              • 数值判断：age &gt; 18（需配合多条边实现）
              <br />
              • 布尔开关：enabled=true 时才执行后续操作
            </p>
          </div>

          {enabled && (!property || valueInput === '') && (
            <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 p-3">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                ⚠️ 请填写完整的条件属性和期望值
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
