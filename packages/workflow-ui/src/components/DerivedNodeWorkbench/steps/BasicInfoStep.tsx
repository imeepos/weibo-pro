import React from 'react'
import { useDerivedNodeWorkbench } from '../../../store/derived-node-workbench.store'
import { SmartFormField } from '../../PropertyPanel/SmartFormField'

export function BasicInfoStep() {
  const { nodeMetadata, updateMetadata } = useDerivedNodeWorkbench()

  return (
    <div className="space-y-4">
      <SmartFormField
        label="节点名称"
        value={nodeMetadata.name}
        type="string"
        onChange={(value) => updateMetadata({ name: value as string })}
      />
      <SmartFormField
        label="节点标题"
        value={nodeMetadata.title}
        type="string"
        onChange={(value) => updateMetadata({ title: value as string })}
      />
      <SmartFormField
        label="节点类型"
        value={nodeMetadata.type}
        type="string"
        onChange={(value) => updateMetadata({ type: value as string })}
      />
      <SmartFormField
        label="节点描述"
        value={nodeMetadata.description}
        type="textarea"
        onChange={(value) => updateMetadata({ description: value as string })}
      />
    </div>
  )
}
