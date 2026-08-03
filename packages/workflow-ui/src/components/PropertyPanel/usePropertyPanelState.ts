'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { root } from '@sker/core'
import { INode, INodeInputMetadata, INodeOutputMetadata, SETTING_METHOD, resolveConstructor } from '@sker/workflow'

export interface UsePropertyPanelStateParams {
  selectedNode?: any
  metadata?: any
  externalFormData?: INode
  externalOnPropertyChange?: (property: string, value: any) => void
}

export function usePropertyPanelState({
  selectedNode,
  metadata,
  externalFormData,
  externalOnPropertyChange,
}: UsePropertyPanelStateParams) {
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

      metadata.inputs.forEach((input: { property: string }) => {
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

  // 获取现有属性名列表（用于验证唯一性）
  const getInputProperties = () => currentDynamicInputs.map((i: { property: string }) => i.property)
  const getOutputProperties = () => currentDynamicOutputs.map((o: { property: string }) => o.property)

  return {
    internalFormData,
    setInternalFormData,
    currentDynamicInputs,
    currentDynamicOutputs,
    portDialogOpen,
    setPortDialogOpen,
    portDialogMode,
    currentPortType,
    editingPortProperty,
    editValues,
    settingRenderer,
    formData,
    handlePropertyChange,
    supportsDynamicInputs,
    supportsDynamicOutputs,
    isControlNode,
    generateDefaultPropertyName,
    _handleConfirmAddInput,
    handleRemoveInput,
    _handleConfirmAddOutput,
    handleRemoveOutput,
    _handleUpdateInput,
    _handleUpdateOutput,
    handleAddPort,
    handleEditPort,
    handleSavePort,
    getInputProperties,
    getOutputProperties,
  }
}
