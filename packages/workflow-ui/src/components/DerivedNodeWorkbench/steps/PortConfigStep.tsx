import React from 'react'
import { useDerivedNodeWorkbench } from '../../../store/derived-node-workbench.store'
import { DynamicPortItem } from '@sker/ui/components/workflow'
import { Button } from '@sker/ui/components/ui/button'
import type { INodeOutputMetadata } from '@sker/workflow'

export function PortConfigStep() {
  const { exposedInputs, customOutputs, addCustomOutput, removeCustomOutput } = useDerivedNodeWorkbench()

  const handleAddOutput = () => {
    const newOutput: INodeOutputMetadata = {
      property: `output_${customOutputs.length + 1}`,
      title: `输出 ${customOutputs.length + 1}`,
      description: '',
      type: 'string',
      isStatic: false
    }
    addCustomOutput(newOutput)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">暴露的输入端口 ({exposedInputs.length})</span>
        </div>
        {exposedInputs.map((input) => (
          <div key={input.property} className="border rounded-lg p-3">
            <div className="text-sm font-medium">{input.title || input.property}</div>
            <div className="text-xs text-muted-foreground">{input.description}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">自定义输出端口 ({customOutputs.length})</span>
          <Button variant="outline" size="sm" onClick={handleAddOutput}>
            添加输出
          </Button>
        </div>
        {customOutputs.map((output) => (
          <DynamicPortItem
            key={output.property}
            property={output.property}
            title={output.title || output.property}
            description={output.description || ''}
            type={output.type || 'string'}
            isStatic={false}
            onPropertyChange={() => {}}
            onTitleChange={() => {}}
            onDescriptionChange={() => {}}
            onTypeChange={() => {}}
            onRemove={() => removeCustomOutput(output.property)}
          />
        ))}
      </div>
    </div>
  )
}
