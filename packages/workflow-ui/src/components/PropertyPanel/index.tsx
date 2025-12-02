'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSelectedNode } from './useSelectedNode'
import { SmartFormField } from './SmartFormField'
import { useReactFlow } from '@xyflow/react'
import { getNodeMetadata } from '../../adapters'
import { resolveConstructor } from '@sker/workflow'
import { ErrorDetailPanel } from '../ErrorDetail'
import { SerializedError } from '@sker/core'
import {
  WorkflowPropertyPanel,
  PropertyPanelEmptyState,
  PropertyPanelField,
  SaveStatusIndicator,
  NodeStateBadge,
  type PropertySection,
} from '@sker/ui/components/workflow'

export interface PropertyPanelProps {
  className?: string
}

export function PropertyPanel({ className = '' }: PropertyPanelProps) {
  const selectedNode = useSelectedNode()
  const { setNodes } = useReactFlow()

  const [formData, setFormData] = useState<Record<string, any>>({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (selectedNode) {
      const metadata = getNodeMetadata(resolveConstructor(selectedNode.data))
      const initialData: Record<string, any> = {
        name: selectedNode.data.name,
        description: selectedNode.data.description,
        color: selectedNode.data.color,
      }

      metadata.inputs.forEach((input) => {
        initialData[input.property] = (selectedNode.data as any)[input.property]
      })

      setFormData(initialData)
      setHasChanges(false)
    }
  }, [selectedNode?.id])

  const handlePropertyChange = (property: string, value: any) => {
    setFormData({
      ...formData,
      [property]: value,
    })
    setHasChanges(true)
  }

  const handleSave = () => {
    if (!selectedNode || !hasChanges) return

    const ast = selectedNode.data
    const { name, description, color, ...inputProperties } = formData

    if (name !== undefined) ast.name = name
    if (description !== undefined) ast.description = description
    if (color !== undefined) ast.color = color

    Object.entries(inputProperties).forEach(([property, value]) => {
      ;(ast as any)[property] = value
    })

    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === selectedNode.id
          ? { ...node, data: { ...node.data } }
          : node
      )
    )

    setHasChanges(false)
  }

  const saveStatus = useMemo(() => {
    if (hasChanges) return 'unsaved'
    if (formData && Object.keys(formData).length > 0) return 'saved'
    return 'idle'
  }, [hasChanges, formData])

  if (!selectedNode) {
    return (
      <WorkflowPropertyPanel
        className={className}
        emptyState={<PropertyPanelEmptyState />}
      />
    )
  }

  const metadata = getNodeMetadata(resolveConstructor(selectedNode.data))
  const ast = selectedNode.data

  const editableProperties = metadata.inputs.map((input) => ({
    ...input,
    value: formData[input.property] ?? (ast as any)[input.property],
  }))

  const readonlyProperties = metadata.outputs.map((output) => ({
    ...output,
    value: (ast as any)[output.property],
  }))

  const sections: PropertySection[] = [
    {
      id: 'basic',
      title: '基础信息',
      color: 'info',
      defaultOpen: true,
      actions: (
        <div className="flex items-center gap-2">
          <SaveStatusIndicator status={saveStatus as any} />
          {hasChanges && (
            <button
              onClick={handleSave}
              className="px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              保存
            </button>
          )}
        </div>
      ),
      content: (
        <>
          <SmartFormField
            label="节点名称"
            value={formData.name || metadata.title}
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
      actions: (
        <div className="flex items-center gap-2">
          <SaveStatusIndicator status={saveStatus as any} />
          {hasChanges && (
            <button
              onClick={handleSave}
              className="px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              保存
            </button>
          )}
        </div>
      ),
      content: (
        <>
          {editableProperties.map((prop) => (
            <SmartFormField
              key={prop.property}
              label={prop.label || prop.property}
              value={prop.value}
              type={prop.type}
              onChange={(value) => handlePropertyChange(prop.property, value)}
            />
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
        {selectedNode.data.error && (
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

