import React from 'react'
import { useDerivedNodeWorkbench } from '../../../store/derived-node-workbench.store'
import { SmartFormField } from '../../PropertyPanel/SmartFormField'
import { Checkbox } from '@sker/ui/components/ui/checkbox'

export function FrozenInputsStep() {
  const { baseNode, frozenInputs, setFrozenInput, toggleInputExposed, exposedInputs } = useDerivedNodeWorkbench()

  if (!baseNode?.metadata?.inputs) return null

  return (
    <div className="space-y-4">
      {baseNode.metadata.inputs.map((input) => {
        const isExposed = exposedInputs.some(i => i.property === input.property)
        const _isFrozen = input.property in frozenInputs

        return (
          <div key={input.property} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{input.title || input.property}</span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Checkbox
                    checked={isExposed}
                    onCheckedChange={(checked) => toggleInputExposed(input.property, !!checked)}
                  />
                  暴露
                </label>
              </div>
            </div>
            {!isExposed && (
              <SmartFormField
                label="冻结值"
                value={frozenInputs[input.property] ?? input.defaultValue}
                type={input.type as any}
                onChange={(value) => setFrozenInput(input.property, value)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
