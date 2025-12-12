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
import { NodeRunHistory } from './NodeRunHistory'
import { INode } from '@sker/workflow'

// ✨ 稳定的设置面板包装器，避免因 formData 改变而重新挂载
const SettingsTabContent = React.memo(({
  formData,
  onPropertyChange
}: {
  formData: INode
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
  onAutoSave?: () => void
  onUpdateNode?: (nodeId: string, updates: Record<string, any>) => void
  className?: string
}

export function LeftDrawer({ visible, onClose, onRunNode, onLocateNode, onAutoSave, onUpdateNode, className }: LeftDrawerProps) {
  const selectedNode = useSelectedNode()

  // useSelectedNode 已确保节点已编译，可安全获取 metadata
  const metadata = useMemo(() => {
    if (!selectedNode) return null
    return selectedNode.data.metadata
  }, [selectedNode])

  const [formData, setFormData] = useState<INode>({} as INode)
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
      // 只提取用户可编辑的属性，避免覆盖系统属性和元数据
      const initialData: Record<string, any> = {
        name: selectedNode.data.name,
        description: selectedNode.data.description,
        color: selectedNode.data.color,
        portLabels: selectedNode.data.portLabels || {}
      }

      // 提取所有输入参数
      metadata.inputs.forEach((input) => {
        initialData[input.property] = selectedNode.data[input.property]
      })

      // 提取所有状态参数（供 @Setting 组件使用）
      metadata.states?.forEach((state) => {
        const key = String(state.propertyKey)
        initialData[key] = selectedNode.data[key]
      })

      setFormData(initialData as INode)
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
    onUpdateNode?.(selectedNode.id, formData)
    onAutoSave?.()
    setHasChanges(false)
  }, [selectedNode, hasChanges, formData, onUpdateNode, onAutoSave])

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
      content: selectedNode ? (
        <NodeRunHistory nodeId={selectedNode.id} />
      ) : null,
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
