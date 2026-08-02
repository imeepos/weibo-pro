'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
import { INode, INodeInputMetadata, INodeOutputMetadata, SETTING_METHOD, resolveConstructor } from '@sker/workflow'
import { PortDialog } from './PortDialog'

function extractValue(value: any): any {
  if (value && typeof value === 'object') {
    if (typeof value.getValue === 'function') {
      return value.getValue()
    }
    if ('_value' in value && 'closed' in value && 'observers' in value) {
      return value._value
    }
  }
  return value
}

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
  const metadata = selectedNode?.data?.metadata

  const [internalFormData, setInternalFormData] = useState<Record<string, any>>({})
  const [currentDynamicInputs, setCurrentDynamicInputs] = useState<INodeInputMetadata[]>([])
  const [currentDynamicOutputs, setCurrentDynamicOutputs] = useState<INodeOutputMetadata[]>([])

  // 弹框状态
  const [portDialogOpen, setPortDialogOpen] = useState(false)
  const [portDialogMode, setPortDialogMode] = useState<'add' | 'edit'>('add')
  const [currentPortType, setCurrentPortType] = useState<'input' | 'output'>('input')
  const [editingPortProperty, setEditingPortProperty] = useState<string>()
  const [editValues, setEditValues] = useState<Partial<INodeInputMetadata | INodeOutputMetadata>>()

  // 获取节点的 @Setting 渲染器
  // 使用 ref 避免重新创建导致无限渲染
  const settingRendererRef = useRef<any>(null)
  const settingRendererKey = useMemo(() => selectedNode?.data?.type, [selectedNode?.data?.type])

  const settingRenderer = useMemo(() => {
    if (!selectedNode?.data) return null
    if (settingRendererRef.current && settingRendererKey) {
      return settingRendererRef.current
    }

    try {
      const ctor = resolveConstructor(selectedNode.data)
      const settings = root.get(SETTING_METHOD, [])
      const setting = settings.find(s => s.ast === ctor)
      if (!setting) {
        settingRendererRef.current = null
        return null
      }
      const instance = root.get(setting.target)
      // 不使用 bind，直接返回一个调用包装函数
      const renderer = (ast: any, onPropertyChange: (prop: string, value: any) => void) => {
        return (instance as any)[setting.property].call(instance, ast, onPropertyChange)
      }
      settingRendererRef.current = renderer
      return renderer
    } catch {
      settingRendererRef.current = null
      return null
    }
  }, [selectedNode?.data, settingRendererKey])

  const formData: INode = (externalFormData ?? internalFormData) as INode;
  const handlePropertyChange = externalOnPropertyChange ?? ((property: string, value: any) => {
    setInternalFormData({
      ...internalFormData,
      [property]: value,
    })
  })

  const supportsDynamicInputs = useMemo(() => metadata?.class?.dynamicInputs === true, [metadata])
  const supportsDynamicOutputs = useMemo(() => metadata?.class?.dynamicOutputs === true, [metadata])
  const isControlNode = useMemo(() => metadata?.class?.type === 'control', [metadata])

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

  // 初始化内部表单数据（仅在无外部 formData 时）
  useEffect(() => {
    if (selectedNode && !externalFormData && metadata) {
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
  }, [selectedNode?.id, externalFormData, metadata])

  // 动态端口状态必须与 metadata 同步（无论是否有外部 formData）
  useEffect(() => {
    if (metadata) {
      setCurrentDynamicInputs(metadata.inputs || [])
      setCurrentDynamicOutputs(metadata.outputs || [])
    }
  }, [selectedNode?.id, metadata])

  if (!selectedNode || !metadata) {
    return (
      <WorkflowPropertyPanel
        className={className}
        emptyState={<PropertyPanelEmptyState />}
      />
    )
  }

  const ast = selectedNode.data

  const editableProperties = metadata.inputs.map((input) => ({
    ...input,
    label: input.title || input.property,
  }))

  const readonlyProperties = metadata.outputs.map((output) => ({
    ...output,
    label: output.title || output.property,
    value: extractValue((ast as any)[output.property]),
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

  // 如果有 @Setting 渲染器，添加自定义设置 section
  if (settingRenderer) {
    // 合并 formData 到 ast，确保 Setting 组件能获取最新状态
    const mergedAst = { ...ast, ...formData } as typeof ast
    sections.push({
      id: 'custom-setting',
      title: '节点设置',
      color: 'primary',
      defaultOpen: true,
      content: settingRenderer(mergedAst, handlePropertyChange),
    })
  }

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
                value={formData[prop.property] ?? (ast as any)[prop.property] ?? prop.defaultValue}
                type={prop.type as InputFieldType}
                options={prop.options}
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

  const _handleConfirmAddInput = () => {
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

  const _handleConfirmAddOutput = () => {
    const property = generateDefaultPropertyName('output')

    const newOutput: INodeOutputMetadata = {
      property,
      title: property,
      description: '',
      type: 'string',
      isStatic: false,
      condition: isControlNode ? '$input === ' : undefined
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

  const _handleUpdateInput = (property: string, field: keyof INodeInputMetadata, value: any) => {
    const nowUpdateInputs = currentDynamicInputs.map((item: INodeInputMetadata) => {
      if (item.property === property) {
        return { ...item, [field]: value }
      }
      return item
    })
    handlePropertyChange('metadata', { ...metadata, inputs: nowUpdateInputs })
    setCurrentDynamicInputs(nowUpdateInputs)
  }

  const _handleUpdateOutput = (property: string, field: keyof INodeOutputMetadata, value: any) => {
    const nowUpdateOutputs = currentDynamicOutputs.map((item: INodeOutputMetadata) => {
      if (item.property === property) {
        return { ...item, [field]: value }
      }
      return item
    })
    handlePropertyChange('metadata', { ...metadata, outputs: nowUpdateOutputs })
    setCurrentDynamicOutputs(nowUpdateOutputs)
  }

  // 添加端口
  const handleAddPort = (portType: 'input' | 'output') => {
    setPortDialogMode('add')
    setCurrentPortType(portType)
    setEditValues(undefined)
    setPortDialogOpen(true)
  }

  // 编辑端口
  const handleEditPort = (property: string, portType: 'input' | 'output') => {
    const ports = portType === 'input' ? currentDynamicInputs : currentDynamicOutputs
    const port = ports.find((p: { property: string }) => p.property === property)
    if (port) {
      setPortDialogMode('edit')
      setCurrentPortType(portType)
      setEditingPortProperty(property)
      setEditValues(port)
      setPortDialogOpen(true)
    }
  }

  // 保存端口（添加或更新）
  const handleSavePort = (port: INodeInputMetadata | INodeOutputMetadata) => {
    if (currentPortType === 'input') {
      if (portDialogMode === 'add') {
        const updatedInputs = [...currentDynamicInputs, port as INodeInputMetadata]
        handlePropertyChange('metadata', { ...metadata, inputs: updatedInputs })
        setCurrentDynamicInputs(updatedInputs)
      } else {
        const updatedInputs = currentDynamicInputs.map((item: INodeInputMetadata) =>
          item.property === editingPortProperty ? (port as INodeInputMetadata) : item
        )
        handlePropertyChange('metadata', { ...metadata, inputs: updatedInputs })
        setCurrentDynamicInputs(updatedInputs)
      }
    } else {
      if (portDialogMode === 'add') {
        const updatedOutputs = [...currentDynamicOutputs, port as INodeOutputMetadata]
        handlePropertyChange('metadata', { ...metadata, outputs: updatedOutputs })
        setCurrentDynamicOutputs(updatedOutputs)
      } else {
        const updatedOutputs = currentDynamicOutputs.map((item: INodeOutputMetadata) =>
          item.property === editingPortProperty ? (port as INodeOutputMetadata) : item
        )
        handlePropertyChange('metadata', { ...metadata, outputs: updatedOutputs })
        setCurrentDynamicOutputs(updatedOutputs)
      }
    }
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
            <Button variant="outline" size="sm" onClick={() => handleAddPort('input')}>
              添加输入
            </Button>
          </div>}

          {currentDynamicInputs.map((input, index) => (
            <DynamicPortItem
              key={`${input.property}-${index}`}
              property={input.property}
              title={input.title}
              description={input.description}
              type={input.type}
              isStatic={input.isStatic !== false}
              required={input.required}
              defaultValue={input.defaultValue}
              onEdit={() => handleEditPort(input.property, 'input')}
              onRemove={input.isStatic !== false ? undefined : () => handleRemoveInput(input.property)}
            />
          ))}
        </div>
        <div className="space-y-2">
          {supportsDynamicOutputs && <div className="flex items-center justify-between">
            <span className="text-xs font-medium">输出端口 ({currentDynamicOutputs.length})</span>
            <Button variant="outline" size="sm" onClick={() => handleAddPort('output')}>
              添加输出
            </Button>
          </div>}

          {currentDynamicOutputs.map((output, index) => (
            <DynamicPortItem
              key={`${output.property}-${index}`}
              property={output.property}
              title={output.title}
              description={output.description}
              type={output.type}
              isStatic={output.isStatic !== false}
              isRouter={output.isRouter}
              condition={output.condition}
              defaultValue={output.defaultValue}
              onEdit={() => handleEditPort(output.property, 'output')}
              onRemove={output.isStatic !== false ? undefined : () => handleRemoveOutput(output.property)}
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

  // 获取现有属性名列表（用于验证唯一性）
  const getInputProperties = () => currentDynamicInputs.map((i: { property: string }) => i.property)
  const getOutputProperties = () => currentDynamicOutputs.map((o: { property: string }) => o.property)

  return (
    <>
      <WorkflowPropertyPanel sections={sections} className={className} />
      <PortDialog
        open={portDialogOpen}
        onOpenChange={setPortDialogOpen}
        mode={portDialogMode}
        portType={currentPortType}
        initialValues={editValues}
        existingProperties={currentPortType === 'input' ? getInputProperties() : getOutputProperties()}
        onSave={handleSavePort}
      />
    </>
  )
}
