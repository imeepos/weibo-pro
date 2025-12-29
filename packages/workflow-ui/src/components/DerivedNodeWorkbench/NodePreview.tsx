import React from 'react'
import { useDerivedNodeWorkbench } from '../../store/derived-node-workbench.store'
import { WorkflowNode } from '@sker/ui/components/workflow'

export function NodePreview() {
  const { getPreviewMetadata } = useDerivedNodeWorkbench()
  const preview = getPreviewMetadata()

  if (!preview) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        选择元节点以预览
      </div>
    )
  }

  const metadata = preview.metadata!

  return (
    <div className="p-4">
      <WorkflowNode
        id={preview.id}
        type={metadata.class.type || 'action'}
        label={preview.name || metadata.class.title || ''}
        status={preview.state}
        statusCount={preview.count}
        inputs={metadata.inputs}
        outputs={metadata.outputs}
        color={preview.color}
        selected={false}
        collapsed={false}
      />
    </div>
  )
}
