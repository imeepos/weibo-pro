'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
import { INode, INodeInputMetadata, INodeOutputMetadata } from '@sker/workflow'

export interface PropertyPanelProps {
  className?: string
  formData?: INode
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

  const formData: INode = (externalFormData ?? internalFormData) as INode;
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
                <label className="block text-xs font-medium text-muted-foreground">
                  {prop.label || prop.property}
                </label>
              </div>
              <SmartFormField
                label=""
                value={prop.defaultValue}
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
  const supportsDynamicInputs = useMemo(() => metadata.class.dynamicInputs === true, [metadata])
  const supportsDynamicOutputs = useMemo(() =>metadata.class.dynamicOutputs === true, [ metadata])

  // ✅ 优先从 formData 读取（包含未保存的修改），否则从 AST 读取
  const [currentDynamicInputs, setCurrentDynamicInputs] = useState<INodeInputMetadata[]>(metadata.inputs || [])
  const [currentDynamicOutputs, setCurrentDynamicOutputs] = useState<INodeOutputMetadata[]>(metadata.outputs || [])

  // 生成默认属性名（确保唯一性）
  const generateDefaultPropertyName = useCallback((prefix: 'input' | 'output'): string => {
    const existingProperties = new Set([
      ...currentDynamicInputs.map((i: { property: string }) => i.property),
      ...currentDynamicOutputs.map((o: { property: string }) => o.property),
    ])

    let counter = 1
    while (existingProperties.has(`${prefix}_${counter}`)) {
      counter++
    }
    return `${prefix}_${counter}`
  }, [currentDynamicInputs, currentDynamicOutputs])

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
    handlePropertyChange('metadata', { ...metadata, inputs: updatedInputs })
    setCurrentDynamicInputs(updatedInputs)
  }

  const handleRemoveInput = (property: string) => {
    const updatedInputs = currentDynamicInputs.filter((i: { property: string }) => i.property !== property)
    handlePropertyChange('metadata', { ...metadata, inputs: updatedInputs })
    setCurrentDynamicInputs(updatedInputs)
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
    const outputs = [...currentDynamicOutputs, newOutput]
    handlePropertyChange('metadata', { ...metadata, outputs })
    setCurrentDynamicOutputs(outputs)
  }

  const handleRemoveOutput = (property: string) => {
    const outputs = currentDynamicOutputs.filter((o: { property: string }) => o.property !== property)
    handlePropertyChange('metadata', { ...metadata, outputs })
    setCurrentDynamicOutputs(outputs)
  }

  const handleUpdateInput = (property: string, field: keyof INodeInputMetadata, value: any) => {
    const nowUpdateInputs = currentDynamicInputs.map((item: INodeInputMetadata) => {
      if (item.property === property) {
        return { ...item, [field]: value }
      }
      return item
    })
    handlePropertyChange('metadata', { ...metadata, inputs: nowUpdateInputs })
    setCurrentDynamicInputs(nowUpdateInputs)
  }

  const handleUpdateOutput = (property: string, field: keyof INodeOutputMetadata, value: any) => {
    const nowUpdateOutputs = currentDynamicOutputs.map((item: INodeOutputMetadata) => {
      if (item.property === property) {
        return { ...item, [field]: value }
      }
      return item
    })
    handlePropertyChange('metadata', { ...metadata, outputs: nowUpdateOutputs })
    setCurrentDynamicOutputs(nowUpdateOutputs)
  }

  sections.push({
    id: 'dynamic-ports',
    title: '动态端口管理',
    color: 'warning',
    defaultOpen: true,
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          {supportsDynamicInputs && <div className="flex items-center justify-between">
            <span className="text-xs font-medium">输入端口 ({currentDynamicInputs.length})</span>
            <Button variant="outline" size="sm" onClick={() => handleConfirmAddInput()}>
              添加输入
            </Button>
          </div>}

          {currentDynamicInputs.map((input, index) => (
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
        <div className="space-y-2">
          {supportsDynamicOutputs && <div className="flex items-center justify-between">
            <span className="text-xs font-medium">输出端口 ({currentDynamicOutputs.length})</span>
            <Button variant="outline" size="sm" onClick={() => handleConfirmAddOutput()}>
              添加输出
            </Button>
          </div>}


          {currentDynamicOutputs.map((output, index) => (
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
      </div>
    ),
  })

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
