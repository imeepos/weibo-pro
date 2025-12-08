'use client'

import React, { useState, useEffect } from 'react'
import { useSelectedNode } from './useSelectedNode'
import { SmartFormField } from './SmartFormField'
import { ErrorDetailPanel } from '../ErrorDetail'
import { SerializedError, root } from '@sker/core'
import {
  WorkflowPropertyPanel,
  PropertyPanelEmptyState,
  PropertyPanelField,
  NodeStateBadge,
  DynamicPortItem,
  type PropertySection,
  type InputFieldType,
} from '@sker/ui/components/workflow'
import { Button } from '@sker/ui/components/ui/button'
import { Input } from '@sker/ui/components/ui/input'
import { PencilIcon } from 'lucide-react'

export interface PropertyPanelProps {
  className?: string
  formData?: Record<string, any>
  onPropertyChange?: (property: string, value: any) => void
}

export function PropertyPanel({
  className = '',
  formData: externalFormData,
  onPropertyChange: externalOnPropertyChange
}: PropertyPanelProps) {
  const selectedNode = useSelectedNode()

  const [internalFormData, setInternalFormData] = useState<Record<string, any>>({})
  const [editingPortLabel, setEditingPortLabel] = useState<string | null>(null)

  const formData = externalFormData ?? internalFormData
  const handlePropertyChange = externalOnPropertyChange ?? ((property: string, value: any) => {
    setInternalFormData({
      ...internalFormData,
      [property]: value,
    })
  })

  useEffect(() => {
    if (selectedNode && !externalFormData) {
      // ✅ 直接使用 metadata 字段，不需要动态获取
      const metadata = selectedNode.data.metadata
      if (!metadata) return

      const initialData: Record<string, any> = {
        name: selectedNode.data.name,
        description: selectedNode.data.description,
        color: selectedNode.data.color,
      }

      metadata.inputs.forEach((input) => {
        initialData[input.property] = (selectedNode.data as any)[input.property]
      })

      setInternalFormData(initialData)
    }
  }, [selectedNode?.id, externalFormData])

  if (!selectedNode) {
    return (
      <WorkflowPropertyPanel
        className={className}
        emptyState={<PropertyPanelEmptyState />}
      />
    )
  }

  // ✅ 直接使用 metadata 字段
  const metadata = selectedNode.data.metadata
  if (!metadata) {
    return (
      <WorkflowPropertyPanel
        className={className}
        emptyState={<PropertyPanelEmptyState />}
      />
    )
  }

  const ast = selectedNode.data

  const portLabels: Record<string, string> = (ast as any).portLabels || {}

  const editableProperties = metadata.inputs.map((input) => ({
    ...input,
    label: input.title || input.property,
    value: formData[input.property] ?? (ast as any)[input.property],
  }))

  const handlePortLabelChange = (property: string, newLabel: string) => {
    const updatedLabels = { ...portLabels, [property]: newLabel }
    // 清除空标签
    if (!newLabel.trim()) delete updatedLabels[property]
    handlePropertyChange('portLabels', updatedLabels)
  }

  const readonlyProperties = metadata.outputs.map((output) => ({
    ...output,
    label: output.title || output.property,
    value: (ast as any)[output.property],
  }))

  const sections: PropertySection[] = [
    {
      id: 'basic',
      title: '基础信息',
      color: 'info',
      defaultOpen: true,
      content: (
        <>
          <SmartFormField
            label="节点名称"
            value={formData.name || metadata.class.title}
            type="string"
            onChange={(value) => handlePropertyChange('name', value)}
          />
          <SmartFormField
            label="节点描述"
            value={formData.description || ''}
            type="textarea"
            onChange={(value) => handlePropertyChange('description', value)}
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              节点颜色
            </label>
            <input
              type="color"
              value={formData.color || '#3b82f6'}
              onChange={(e) => handlePropertyChange('color', e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-card cursor-pointer"
            />
          </div>
        </>
      ),
    },
  ]

  if (editableProperties.length > 0) {
    sections.push({
      id: 'inputs',
      title: '输入参数',
      color: 'primary',
      defaultOpen: true,
      content: (
        <>
          {editableProperties.map((prop) => (
            <div key={prop.property} className="space-y-1.5">
              <div className="flex items-center gap-1">
                {editingPortLabel === prop.property ? (
                  <Input
                    autoFocus
                    className="h-6 text-xs"
                    defaultValue={portLabels[prop.property] || prop.label || prop.property}
                    onBlur={(e) => {
                      handlePortLabelChange(prop.property, e.target.value)
                      setEditingPortLabel(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handlePortLabelChange(prop.property, e.currentTarget.value)
                        setEditingPortLabel(null)
                      }
                      if (e.key === 'Escape') setEditingPortLabel(null)
                    }}
                  />
                ) : (
                  <>
                    <label className="block text-xs font-medium text-muted-foreground">
                      {prop.label || prop.property}
                    </label>
                    <button
                      onClick={() => setEditingPortLabel(prop.property)}
                      className="p-0.5 hover:bg-muted rounded"
                      title="编辑端口名称"
                    >
                      <PencilIcon className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </>
                )}
              </div>
              <SmartFormField
                label=""
                value={prop.value}
                type={prop.type as InputFieldType}
                onChange={(value) => handlePropertyChange(prop.property, value)}
              />
            </div>
          ))}
        </>
      ),
    })
  }

  if (readonlyProperties.length > 0) {
    sections.push({
      id: 'outputs',
      title: '输出结果',
      color: 'success',
      defaultOpen: false,
      content: (
        <>
          {readonlyProperties.map((prop) => (
            <PropertyPanelField
              key={prop.property}
              label={prop.label || prop.property}
              value={prop.value}
              readonly
            />
          ))}
        </>
      ),
    })
  }

  // 检查节点是否支持动态输入/输出
  const supportsDynamicInputs = metadata.class.dynamicInputs === true
  const supportsDynamicOutputs = metadata.class.dynamicOutputs === true

  if (supportsDynamicInputs || supportsDynamicOutputs) {
    const dynamicInputs = metadata.inputs.filter(() => supportsDynamicInputs)
    const dynamicOutputs = metadata.outputs

    const handleAddInput = () => {
      const newProperty = `input_${Date.now()}`
      const newInput = { property: newProperty, title: '新输入', description: '', type: 'string' as const }
      metadata.inputs.push(newInput)
      handlePropertyChange('metadata', { ...metadata })
    }

    const handleRemoveInput = (property: string) => {
      metadata.inputs = metadata.inputs.filter(i => i.property !== property)
      handlePropertyChange('metadata', { ...metadata })
    }

    const handleAddOutput = () => {
      const newProperty = `output_${Date.now()}`
      const newOutput = { property: newProperty, title: '新输出', description: '', type: 'string' }
      metadata.outputs.push(newOutput)
      handlePropertyChange('metadata', { ...metadata })
    }

    const handleRemoveOutput = (property: string) => {
      metadata.outputs = metadata.outputs.filter(o => o.property !== property)
      handlePropertyChange('metadata', { ...metadata })
    }

    sections.push({
      id: 'dynamic-ports',
      title: '动态端口管理',
      color: 'warning',
      defaultOpen: true,
      content: (
        <div className="space-y-4">
          {supportsDynamicInputs && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">输入端口 ({dynamicInputs.length})</span>
                <Button variant="outline" size="sm" onClick={handleAddInput}>
                  添加输入
                </Button>
              </div>
              {dynamicInputs.map((input) => (
                <DynamicPortItem
                  key={input.property}
                  title={input.title || input.property}
                  description={input.description || ''}
                  type={input.type || 'string'}
                  onTitleChange={(value) => {
                    input.title = value
                    handlePropertyChange('metadata', { ...metadata })
                  }}
                  onDescriptionChange={(value) => {
                    input.description = value
                    handlePropertyChange('metadata', { ...metadata })
                  }}
                  onTypeChange={(value) => {
                    input.type = value as any
                    handlePropertyChange('metadata', { ...metadata })
                  }}
                  onRemove={() => handleRemoveInput(input.property)}
                />
              ))}
            </div>
          )}
          {supportsDynamicOutputs && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">输出端口 ({dynamicOutputs.length})</span>
                <Button variant="outline" size="sm" onClick={handleAddOutput}>
                  添加输出
                </Button>
              </div>
              {dynamicOutputs.map((output) => (
                <DynamicPortItem
                  key={output.property}
                  title={output.title || output.property}
                  description={output.description || ''}
                  type={output.type || 'string'}
                  onTitleChange={(value) => {
                    output.title = value
                    handlePropertyChange('metadata', { ...metadata })
                  }}
                  onDescriptionChange={(value) => {
                    output.description = value
                    handlePropertyChange('metadata', { ...metadata })
                  }}
                  onTypeChange={(value) => {
                    output.type = value
                    handlePropertyChange('metadata', { ...metadata })
                  }}
                  onRemove={() => handleRemoveOutput(output.property)}
                />
              ))}
            </div>
          )}
        </div>
      ),
    })
  }

  sections.push({
    id: 'info',
    title: '节点信息',
    color: 'secondary',
    defaultOpen: false,
    content: (
      <>
        <PropertyPanelField label="节点ID" value={selectedNode.id} readonly />
        <div className="space-y-1.5 opacity-70">
          <label className="block text-xs font-medium text-muted-foreground mb-1">运行状态</label>
          <div className="text-xs">
            <NodeStateBadge state={selectedNode.data.state || 'idle'} />
          </div>
        </div>
        {selectedNode.data.error && selectedNode.data.state === 'fail' && (
          <div className="space-y-1.5 opacity-70">
            <label className="block text-xs font-medium text-muted-foreground mb-1">错误信息</label>
            <div className="bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/30">
              <ErrorDetailPanel error={selectedNode.data.error as SerializedError} />
            </div>
          </div>
        )}
      </>
    ),
  })

  return <WorkflowPropertyPanel sections={sections} className={className} />
}
