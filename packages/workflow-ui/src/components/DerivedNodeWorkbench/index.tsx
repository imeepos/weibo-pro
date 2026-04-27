import React, { useState } from 'react'
import { Toaster, toast } from 'sonner'
import { MetaNodePicker } from './MetaNodePicker'
import { ConfigEditor } from './ConfigEditor'
import { NodePreview } from './NodePreview'
import { useDerivedNodeWorkbench } from '../../store/derived-node-workbench.store'
import { Button } from '@sker/ui/components/ui/button'
import { saveDerivedNode } from '../../services/derived-node.api'
import { buildDerivedNodeCreatePayload, getDerivedNodeSaveValidationError } from './save-payload'

export function DerivedNodeWorkbench() {
  const { reset, baseNode, frozenInputs, exposedInputs, customOutputs, nodeMetadata } = useDerivedNodeWorkbench()
  const [isSaving, setIsSaving] = useState(false)

  const saveDraft = {
    baseNode,
    frozenInputs,
    exposedInputs,
    customOutputs,
    nodeMetadata
  }

  const handleSave = async () => {
    const validationError = getDerivedNodeSaveValidationError(saveDraft)
    if (validationError) {
      toast.error(validationError)
      return
    }

    const payload = buildDerivedNodeCreatePayload(saveDraft)
    if (!payload) {
      toast.error('请先选择元节点')
      return
    }

    setIsSaving(true)

    try {
      await saveDerivedNode(payload)
      toast.success('保存成功')
    } catch (error: any) {
      const detail = error?.message ? `保存失败：${error.message}` : '保存失败'
      toast.error(detail)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
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
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <NodePreview />
          </div>
        </div>
      </div>
      <Toaster />
    </>
  )
}
