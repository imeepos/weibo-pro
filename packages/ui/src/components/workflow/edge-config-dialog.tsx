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
import { ScrollArea } from '../ui/scroll-area'
import { EdgeModeSelector, type EdgeModeOption } from './edge-mode-selector'
import { EdgeDataMapping } from './edge-data-mapping'
import { EdgeLoopConfig } from './edge-loop-config'
import { EdgePreview, type EdgeModeStyle } from './edge-preview'

export interface EdgeConfigDialogProps {
  open: boolean
  edge: IEdge | null
  modeOptions: EdgeModeOption[]
  modeStyles: Record<EdgeMode, EdgeModeStyle>
  onOpenChange: (open: boolean) => void
  onSave: (edgeConfig: Partial<IEdge>) => void
}

export function EdgeConfigDialog({
  open,
  edge,
  modeOptions,
  modeStyles,
  onOpenChange,
  onSave
}: EdgeConfigDialogProps) {
  const [mode, setMode] = useState<EdgeMode>(EdgeMode.MERGE)
  const [fromProperty, setFromProperty] = useState('')
  const [toProperty, setToProperty] = useState('')
  const [weight, setWeight] = useState(1)
  const [isPrimary, setIsPrimary] = useState(false)
  const [isLoopBack, setIsLoopBack] = useState(false)
  const [maxLoopIterations, setMaxLoopIterations] = useState(100)
  const [loopConditionProperty, setLoopConditionProperty] = useState('')

  useEffect(() => {
    if (edge) {
      setMode(edge.mode || EdgeMode.MERGE)
      setFromProperty(edge.fromProperty || '')
      setToProperty(edge.toProperty || '')
      setWeight(edge.weight || 1)
      setIsPrimary(edge.isPrimary || false)
      setIsLoopBack(edge.isLoopBack || false)
      setMaxLoopIterations(edge.maxLoopIterations || 100)
      setLoopConditionProperty(edge.loopConditionProperty || '')
    }
  }, [edge])

  const handleSave = () => {
    const config: Partial<IEdge> = {
      mode,
      fromProperty: fromProperty || undefined,
      toProperty: toProperty || undefined,
      weight,
      isLoopBack,
    }

    if (mode === EdgeMode.WITH_LATEST_FROM) {
      config.isPrimary = isPrimary
    }

    if (isLoopBack) {
      config.maxLoopIterations = maxLoopIterations
      config.loopConditionProperty = loopConditionProperty || undefined
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

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
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

            <EdgeLoopConfig
              isLoopBack={isLoopBack}
              maxLoopIterations={maxLoopIterations}
              loopConditionProperty={loopConditionProperty}
              onLoopBackChange={(checked) => setIsLoopBack(checked as boolean)}
              onMaxIterationsChange={setMaxLoopIterations}
              onConditionPropertyChange={setLoopConditionProperty}
            />

            <EdgePreview mode={mode} modeStyles={modeStyles} />
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
