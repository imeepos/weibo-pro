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
import { INodeInputMetadata, INodeOutputMetadata } from '@sker/workflow'

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
    // ✅ 优先从 formData 读取（包含未保存的修改），否则从 AST 读取
    const currentDynamicInputs: INodeInputMetadata[] = (formData.dynamicInputs || ast.dynamicInputs || [])
    const currentDynamicOutputs: INodeOutputMetadata[] = (formData.dynamicOutputs || ast.dynamicOutputs || [])

    // 合并静态端口和动态端口用于显示
    const allInputsForDisplay: INodeInputMetadata[] = supportsDynamicInputs
      ? [...metadata.inputs, ...currentDynamicInputs]
      : []

    const allOutputsForDisplay: INodeOutputMetadata[] = supportsDynamicOutputs
      ? [...metadata.outputs, ...currentDynamicOutputs]
      : []

    // 生成默认属性名（确保唯一性）
    const generateDefaultPropertyName = (prefix: 'input' | 'output'): string => {
      const existingProperties = new Set([
        ...metadata.inputs.map(i => i.property),
        ...metadata.outputs.map(o => o.property),
        ...currentDynamicInputs.map((i: { property: string }) => i.property),
        ...currentDynamicOutputs.map((o: { property: string }) => o.property),
      ])

      let counter = 1
      while (existingProperties.has(`${prefix}_${counter}`)) {
        counter++
      }
      return `${prefix}_${counter}`
    }

    const handleConfirmAddInput = () => {
      const property = generateDefaultPropertyName('input')

      const newInput: INodeInputMetadata = {
        property,
        title: property,
        description: '',
        type: 'string',
        isStatic: false
      }
      const updatedInputs = [...currentDynamicInputs, newInput]
      handlePropertyChange('dynamicInputs', updatedInputs)
    }

    const handleRemoveInput = (property: string) => {
      const updatedInputs = currentDynamicInputs.filter((i: { property: string }) => i.property !== property)
      handlePropertyChange('dynamicInputs', updatedInputs)
    }

    const handleConfirmAddOutput = () => {
      const property = generateDefaultPropertyName('output')

      const newOutput: INodeOutputMetadata = {
        property,
        title: property,
        description: '',
        type: 'string',
        condition: 'true',
        isStatic: false
      }
      const updatedOutputs = [...currentDynamicOutputs, newOutput]
      handlePropertyChange('dynamicOutputs', updatedOutputs)
    }

    const handleRemoveOutput = (property: string) => {
      const updatedOutputs = currentDynamicOutputs.filter((o: { property: string }) => o.property !== property)
      handlePropertyChange('dynamicOutputs', updatedOutputs)
    }

    const handleUpdateInput = (property: string, field: keyof INodeInputMetadata, value: any) => {
      const nowUpdateInputs = currentDynamicInputs.map((item: INodeInputMetadata) => {
        if (item.property === property) {
          return { ...item, [field]: value }
        }
        return item
      })
      handlePropertyChange('dynamicInputs', [...nowUpdateInputs])
    }

    const handleUpdateOutput = (property: string, field: keyof INodeOutputMetadata, value: any) => {
      const nowUpdateOutputs = currentDynamicOutputs.map((item: INodeOutputMetadata) => {
        if (item.property === property) {
          return { ...item, [field]: value }
        }
        return item
      })
      handlePropertyChange('dynamicOutputs', nowUpdateOutputs)
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
                <span className="text-xs font-medium">输入端口 ({allInputsForDisplay.length})</span>
                <Button variant="outline" size="sm" onClick={() => handleConfirmAddInput()}>
                  添加输入
                </Button>
              </div>

              {allInputsForDisplay.map((input, index) => (
                <DynamicPortItem
                  key={`${input.property}-${index}`}
                  property={input.property}
                  title={input.title || input.property}
                  description={input.description || ''}
                  type={input.type || 'string'}
                  isStatic={input.isStatic !== false}
                  onPropertyChange={(value) => handleUpdateInput(input.property, 'property', value)}
                  onTitleChange={(value) => handleUpdateInput(input.property, 'title', value)}
                  onDescriptionChange={(value) => handleUpdateInput(input.property, 'description', value)}
                  onTypeChange={(value) => handleUpdateInput(input.property, 'type', value)}
                  onRemove={input.isStatic !== false ? undefined : () => handleRemoveInput(input.property)}
                />
              ))}
            </div>
          )}
          {supportsDynamicOutputs && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">输出端口 ({allOutputsForDisplay.length})</span>
                <Button variant="outline" size="sm" onClick={() => handleConfirmAddOutput()}>
                  添加输出
                </Button>
              </div>

              {allOutputsForDisplay.map((output, index) => (
                <DynamicPortItem
                  key={`${output.property}-${index}`}
                  property={output.property}
                  title={output.title || output.property}
                  description={output.description || ''}
                  type={output.type || 'string'}
                  isStatic={output.isStatic !== false}
                  onPropertyChange={(value) => handleUpdateOutput(output.property, 'property', value)}
                  onTitleChange={(value) => handleUpdateOutput(output.property, 'title', value)}
                  onDescriptionChange={(value) => handleUpdateOutput(output.property, 'description', value)}
                  onTypeChange={(value) => handleUpdateOutput(output.property, 'type', value)}
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
