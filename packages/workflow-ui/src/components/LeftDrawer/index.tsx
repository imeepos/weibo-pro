'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { PropertyPanel } from '../PropertyPanel'
import { Workflow, Settings, History, Play, Crosshair, Save } from 'lucide-react'
import { useSelectedNode } from '../PropertyPanel/useSelectedNode'
import {
  WorkflowPropertyDrawer,
  type DrawerTab,
  type DrawerAction,
} from '@sker/ui/components/workflow'
import { useWorkflowStore } from '../../store/workflow.store'

// ✨ 稳定的设置面板包装器，避免因 formData 改变而重新挂载
const SettingsTabContent = React.memo(({
  formData,
  onPropertyChange
}: {
  formData: Record<string, any>
  onPropertyChange: (property: string, value: any) => void
}) => {
  return <PropertyPanel formData={formData} onPropertyChange={onPropertyChange} />
})

SettingsTabContent.displayName = 'SettingsTabContent'

export interface LeftDrawerProps {
  visible: boolean
  onClose: () => void
  onRunNode?: (nodeId: string) => void
  onLocateNode?: (nodeId: string) => void
  onAutoSave?: () => void  // ✨ 触发自动保存
  className?: string
}

export function LeftDrawer({ visible, onClose, onRunNode, onLocateNode, onAutoSave, className }: LeftDrawerProps) {
  const selectedNode = useSelectedNode()
  const updateNode = useWorkflowStore((state) => state.updateNode)

  // useSelectedNode 已确保节点已编译，可安全获取 metadata
  const metadata = useMemo(() => {
    if (!selectedNode) return null
    return selectedNode.data.metadata
  }, [selectedNode])

  const [formData, setFormData] = useState<Record<string, any>>({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (visible && !selectedNode) {
      onClose()
    }
  }, [selectedNode, visible, onClose])

  useEffect(() => {
    if (selectedNode) {
      const metadata = selectedNode.data.metadata
      if (!metadata) return

      const initialData: Record<string, any> = {
        name: selectedNode.data.name,
        description: selectedNode.data.description,
        color: selectedNode.data.color,
        portLabels: (selectedNode.data as any).portLabels,
      }

      metadata.inputs.forEach((input) => {
        initialData[input.property] = (selectedNode.data as any)[input.property]
      })

      setFormData(initialData)
      setHasChanges(false)
    }
  }, [selectedNode?.id])

  const handlePropertyChange = useCallback((property: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [property]: value,
    }))
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(() => {
    if (!selectedNode || !hasChanges) return

    const { name, description, color, portLabels, ...inputProperties } = formData

    // ✨ 构建更新对象
    const updates: Record<string, any> = {}

    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (color !== undefined) updates.color = color
    if (portLabels !== undefined) updates.portLabels = portLabels

    // 添加所有输入属性
    Object.entries(inputProperties).forEach(([property, value]) => {
      updates[property] = value
    })

    // ✨ 直接调用 store 的 updateNode（内部使用 Immer 确保不可变性）
    updateNode(selectedNode.id, updates)

    // ✨ 触发自动保存到后台
    onAutoSave?.()

    setHasChanges(false)
  }, [selectedNode, hasChanges, formData, updateNode, onAutoSave])

  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, handleSave])

  const saveStatus = useMemo(() => {
    if (hasChanges) return 'unsaved'
    if (formData && Object.keys(formData).length > 0) return 'saved'
    return 'idle'
  }, [hasChanges, formData])

  // ✨ 每次都使用最新的 formData 创建 tabs
  // React 会通过 key 和组件类型识别，只更新 props 而不重新挂载
  // SettingsTabContent 用 React.memo 减少不必要的重新渲染
  const tabs: DrawerTab[] = [
    {
      id: 'settings',
      label: '设置',
      icon: Settings,
      content: <SettingsTabContent formData={formData} onPropertyChange={handlePropertyChange} />,
    },
    {
      id: 'history',
      label: '历史',
      icon: History,
      content: (
        <div className="text-center py-12">
          <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">暂无历史记录</p>
          <p className="text-xs text-muted-foreground/70 mt-2">节点执行历史将显示在这里</p>
        </div>
      ),
    },
  ]

  const actions: DrawerAction[] = useMemo(
    () => [
      {
        id: 'save',
        icon: Save,
        label: '保存节点属性',
        onClick: handleSave,
        disabled: !hasChanges,
        variant: 'success',
      },
      {
        id: 'run',
        icon: Play,
        label: '运行此节点',
        onClick: () => selectedNode && onRunNode?.(selectedNode.id),
        disabled: !selectedNode || !onRunNode,
        variant: 'primary',
      },
      {
        id: 'locate',
        icon: Crosshair,
        label: '定位到此节点',
        onClick: () => selectedNode && onLocateNode?.(selectedNode.id),
        disabled: !selectedNode || !onLocateNode,
        variant: 'default',
      },
    ],
    [selectedNode, onRunNode, onLocateNode, hasChanges, handleSave]
  )

  return (
    <WorkflowPropertyDrawer
      visible={visible}
      onClose={onClose}
      title={metadata?.class.title || '节点属性'}
      subtitle={metadata?.class.type}
      icon={Workflow}
      tabs={tabs}
      actions={actions}
      defaultTab="settings"
      className={className}
    />
  )
}
