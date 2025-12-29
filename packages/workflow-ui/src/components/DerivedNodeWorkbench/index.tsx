import React from 'react'
import { MetaNodePicker } from './MetaNodePicker'
import { ConfigEditor } from './ConfigEditor'
import { NodePreview } from './NodePreview'
import { useDerivedNodeWorkbench } from '../../store/derived-node-workbench.store'
import { Button } from '@sker/ui/components/ui/button'

export function DerivedNodeWorkbench() {
  const { reset, toSavePayload } = useDerivedNodeWorkbench()

  const handleSave = () => {
    const payload = toSavePayload()
    console.log('保存派生节点:', payload)
    // TODO: 调用 API 保存
  }

  return (
    <div className="flex h-screen">
      <div className="w-80 border-r">
        <MetaNodePicker />
      </div>

      <div className="flex-1 border-r">
        <ConfigEditor />
      </div>

      <div className="w-96 flex flex-col">
        <div className="border-b p-4">
          <h3 className="text-sm font-semibold mb-3">实时预览</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              重置
            </Button>
            <Button size="sm" onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NodePreview />
        </div>
      </div>
    </div>
  )
}
