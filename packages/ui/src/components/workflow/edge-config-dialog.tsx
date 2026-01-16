'use client'

import React, { useState, useEffect } from 'react'
import { EdgeMode, type IEdge } from './types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'
import { EdgeModeSelector, type EdgeModeOption } from './edge-mode-selector'
import { EdgeDataMapping } from './edge-data-mapping'

export interface EdgeConfigDialogProps {
  open: boolean
  edge: IEdge | null
  modeOptions: EdgeModeOption[]
  onOpenChange: (open: boolean) => void
  onSave: (edgeConfig: Partial<IEdge>) => void
}

export function EdgeConfigDialog({
  open,
  edge,
  modeOptions,
  onOpenChange,
  onSave
}: EdgeConfigDialogProps) {
  const [mode, setMode] = useState<EdgeMode>(EdgeMode.COMBINE_LATEST)
  const [fromProperty, setFromProperty] = useState('')
  const [toProperty, setToProperty] = useState('')
  const [weight, setWeight] = useState(1)
  const [isPrimary, setIsPrimary] = useState(false)
  const [transform, setTransform] = useState('')

  useEffect(() => {
    if (edge) {
      setMode(edge.mode || EdgeMode.COMBINE_LATEST)
      setFromProperty(edge.fromProperty || '')
      setToProperty(edge.toProperty || '')
      setWeight(edge.weight || 1)
      setIsPrimary(edge.isPrimary || false)
      setTransform(edge.transform || '')
    }
  }, [edge])

  const handleSave = () => {
    const config: Partial<IEdge> = {
      mode,
      fromProperty: fromProperty || undefined,
      toProperty: toProperty || undefined,
      weight,
      transform: transform || undefined,
    }

    if (mode === EdgeMode.WITH_LATEST_FROM) {
      config.isPrimary = isPrimary
    }

    onSave(config)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>边配置</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 pr-4">
            <EdgeModeSelector
              value={mode}
              options={modeOptions}
              onChange={setMode}
            />

            {mode === EdgeMode.WITH_LATEST_FROM && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-primary"
                  checked={isPrimary}
                  onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
                />
                <Label htmlFor="is-primary" className="text-sm cursor-pointer">
                  标记为主流
                </Label>
                <p className="text-xs text-muted-foreground ml-auto">
                  主流触发时，会携带其他辅流的最新值
                </p>
              </div>
            )}

            <EdgeDataMapping
              fromProperty={fromProperty}
              toProperty={toProperty}
              weight={weight}
              onFromPropertyChange={setFromProperty}
              onToPropertyChange={setToProperty}
              onWeightChange={setWeight}
            />

            <div className="space-y-2">
              <Label htmlFor="transform" className="text-sm font-medium">
                数据转换表达式
              </Label>
              <Input
                id="transform"
                value={transform}
                onChange={(e) => setTransform(e.target.value)}
                placeholder="$input.map(it => `${it.name}=${it.value}`).join('; ')"
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                使用 $input 引用输入值，支持 JavaScript 表达式
              </p>
            </div>

          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
