'use client'

import React, { useState, useEffect } from 'react'
import { useSelectedNode } from './useSelectedNode'
import { SmartFormField } from './SmartFormField'
import { getNodeMetadata } from '../../adapters'
import { type DynamicOutput } from '@sker/workflow'
import { ErrorDetailPanel } from '../ErrorDetail'
import { SerializedError, root } from '@sker/core'
import {
  WorkflowPropertyPanel,
  PropertyPanelEmptyState,
  PropertyPanelField,
  NodeStateBadge,
  type PropertySection,
  type InputFieldType,
} from '@sker/ui/components/workflow'
import { DynamicOutputsDialog, } from '@sker/ui/components/ui/dynamic-outputs-dialog'
import { Button } from '@sker/ui/components/ui/button'
import { Input } from '@sker/ui/components/ui/input'
import { SettingsIcon, PencilIcon } from 'lucide-react'

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
  const [dynamicOutputsDialogOpen, setDynamicOutputsDialogOpen] = useState(false)
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
      const metadata = getNodeMetadata(selectedNode.data)
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

  const metadata = getNodeMetadata(selectedNode.data)
  const ast = selectedNode.data

  const portLabels: Record<string, string> = (ast as any).portLabels || {}

  const editableProperties = metadata.inputs.map((input) => ({
    ...input,
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

  // 检查节点是否支持动态输出（有 isRouter: true 的输出）
  // ✨使用编译后的 node.metadata.outputs
  if (!ast.metadata) {
    return (
      <WorkflowPropertyPanel
        className={className}
        emptyState={<PropertyPanelEmptyState />}
        sections={[]}
      />
    )
  }
  const outputMetadata = ast.metadata.outputs
  const hasDynamicOutputSupport = outputMetadata.some(meta => meta.isRouter)

  if (hasDynamicOutputSupport) {
    const currentDynamicOutputs = (ast as any).dynamicOutputs as DynamicOutput[] || []

    const handleSaveDynamicOutputs = (outputs: DynamicOutput[]) => {
      if (selectedNode) {
        // 更新节点的 dynamicOutputs 属性
        (selectedNode.data as any).dynamicOutputs = outputs

        // 初始化动态输出的属性值为 undefined
        outputs.forEach(output => {
          if ((selectedNode.data as any)[output.property] === undefined) {
            (selectedNode.data as any)[output.property] = undefined
          }
        })

        // 触发 React Flow 重新渲染
        handlePropertyChange('dynamicOutputs', outputs)
      }
    }

    sections.push({
      id: 'dynamic-outputs',
      title: '动态输出管理',
      color: 'warning',
      defaultOpen: false,
      content: (
        <>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              当前配置了 {currentDynamicOutputs.length} 个动态输出端口
            </p>
            {currentDynamicOutputs.map((output, index) => (
              <div key={index} className="text-xs p-2 bg-muted rounded">
                <div className="font-medium">{output.title}</div>
                <div className="text-muted-foreground font-mono text-[10px]">
                  {output.condition}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDynamicOutputsDialogOpen(true)}
              className="w-full"
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              配置动态输出
            </Button>
          </div>

          <DynamicOutputsDialog
            open={dynamicOutputsDialogOpen}
            onOpenChange={setDynamicOutputsDialogOpen}
            outputs={currentDynamicOutputs}
            onSave={handleSaveDynamicOutputs}
          />
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
