import React from 'react'
import { useDerivedNodeWorkbench } from '../../../store/derived-node-workbench.store'
import { buildDerivedNodeCreatePayload } from '../save-payload'

export function MetadataStep() {
  const {
    baseNode,
    frozenInputs,
    exposedInputs,
    customOutputs,
    nodeMetadata,
    getPreviewMetadata
  } = useDerivedNodeWorkbench()

  const preview = getPreviewMetadata()
  const payload = buildDerivedNodeCreatePayload({
    baseNode,
    frozenInputs,
    exposedInputs,
    customOutputs,
    nodeMetadata
  })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">预览元数据</h3>
        <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-64">
          {JSON.stringify(preview, null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">保存数据</h3>
        <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-64">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </div>
  )
}
