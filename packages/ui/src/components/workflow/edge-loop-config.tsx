'use client'

import React from 'react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import { cn } from '@sker/ui/lib/utils'

export interface EdgeLoopConfigProps {
  isLoopBack: boolean
  maxLoopIterations: number
  loopConditionProperty: string
  onLoopBackChange: (value: boolean) => void
  onMaxIterationsChange: (value: number) => void
  onConditionPropertyChange: (value: string) => void
}

export function EdgeLoopConfig({
  isLoopBack,
  maxLoopIterations,
  loopConditionProperty,
  onLoopBackChange,
  onMaxIterationsChange,
  onConditionPropertyChange
}: EdgeLoopConfigProps) {
  return (
    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="loop-back"
          checked={isLoopBack}
          onCheckedChange={onLoopBackChange}
        />
        <Label htmlFor="loop-back" className="text-sm font-medium cursor-pointer">
          🔄 循环回路边
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">
        标记此边为循环反馈边，节点输出将作为自身或上游节点的输入，实现循环执行
      </p>

      {isLoopBack && (
        <div className="space-y-3 border-t border-amber-500/20 pt-3">
          <div className="space-y-2">
            <Label htmlFor="max-iterations" className="text-xs text-muted-foreground">
              最大循环次数 <span className="text-amber-500">*</span>
            </Label>
            <Input
              id="max-iterations"
              type="number"
              value={maxLoopIterations}
              onChange={(e) => onMaxIterationsChange(parseInt(e.target.value) || 100)}
              min="1"
              max="10000"
              className={cn(
                'focus-visible:border-amber-500',
                'focus-visible:ring-amber-500/50'
              )}
            />
            <p className="text-xs text-muted-foreground">
              防止无限循环，默认 100 次
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition-property" className="text-xs text-muted-foreground">
              停止条件属性 <span className="text-muted-foreground">(可选)</span>
            </Label>
            <Input
              id="condition-property"
              type="text"
              value={loopConditionProperty}
              onChange={(e) => onConditionPropertyChange(e.target.value)}
              placeholder="例如: shouldContinue"
              className={cn(
                'focus-visible:border-amber-500',
                'focus-visible:ring-amber-500/50'
              )}
            />
            <p className="text-xs text-muted-foreground">
              当源节点的此属性为 false/null/undefined 时停止循环
            </p>
          </div>

          <div className="rounded-md bg-amber-500/10 p-3">
            <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              💡 <strong>使用示例：</strong>
              <br />
              • 累加器：输出值反馈为输入，循环累加
              <br />
              • 列表迭代：逐个处理数组元素，hasMore=false 时停止
              <br />
              • 重试逻辑：失败时重试，成功后 isSuccess=true 停止
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
