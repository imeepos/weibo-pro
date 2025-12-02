'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { PropertyPanel } from '../PropertyPanel'
import { Workflow, Settings, History, Play, Crosshair, Save } from 'lucide-react'
import { useSelectedNode } from '../PropertyPanel/useSelectedNode'
import { getNodeMetadata } from '../../adapters'
import { resolveConstructor } from '@sker/workflow'
import { useReactFlow } from '@xyflow/react'
import {
  WorkflowPropertyDrawer,
  type DrawerTab,
  type DrawerAction,
} from '@sker/ui/components/workflow'

export interface LeftDrawerProps {
  visible: boolean
  onClose: () => void
  onRunNode?: (nodeId: string) => void
  onLocateNode?: (nodeId: string) => void
  className?: string
}

export function LeftDrawer({ visible, onClose, onRunNode, onLocateNode, className }: LeftDrawerProps) {
  const selectedNode = useSelectedNode()
  const metadata = selectedNode ? getNodeMetadata(resolveConstructor(selectedNode.data)) : null
  const { setNodes } = useReactFlow()

  const [formData, setFormData] = useState<Record<string, any>>({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (visible && !selectedNode) {
      onClose()
    }
  }, [selectedNode, visible, onClose])

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

  const handleSave = useCallback(() => {
    if (!selectedNode || !hasChanges) return

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === selectedNode.id) {
          const { name, description, color, ...inputProperties } = formData

          // 直接修改 AST 实例（node.data），保持引用不变
          // 同时检测是否有实际变更
          let hasActualChanges = false

          if (name !== undefined && node.data.name !== name) {
            node.data.name = name
            hasActualChanges = true
          }
          if (description !== undefined && node.data.description !== description) {
            node.data.description = description
            hasActualChanges = true
          }
          if (color !== undefined && node.data.color !== color) {
            node.data.color = color
            hasActualChanges = true
          }

          Object.entries(inputProperties).forEach(([property, value]) => {
            if ((node.data as any)[property] !== value) {
              (node.data as any)[property] = value
              hasActualChanges = true
            }
          })

          // 如果有变更，返回新的 node 对象（浅拷贝）触发 React 重渲染
          // 但 data 引用保持不变，仍然指向 AST 实例
          if (hasActualChanges) {
            return { ...node }
          }
        }
        return node
      })
    )

    setHasChanges(false)
  }, [selectedNode, hasChanges, formData, setNodes])

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

  const tabs: DrawerTab[] = useMemo(
    () => [
      {
        id: 'settings',
        label: '设置',
        icon: Settings,
        content: <PropertyPanel formData={formData} onPropertyChange={handlePropertyChange} />,
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
    ],
    [formData, handlePropertyChange]
  )

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
      title={metadata?.label || '节点属性'}
      subtitle={metadata?.type}
      icon={Workflow}
      tabs={tabs}
      actions={actions}
      defaultTab="settings"
      className={className}
    />
  )
}
