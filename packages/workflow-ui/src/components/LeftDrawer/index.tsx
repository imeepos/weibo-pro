'use client'

import React, { useEffect, useMemo } from 'react'
import { PropertyPanel } from '../PropertyPanel'
import { Workflow, Settings, History, Play, Crosshair } from 'lucide-react'
import { useSelectedNode } from '../PropertyPanel/useSelectedNode'
import { getNodeMetadata } from '../../adapters'
import { resolveConstructor } from '@sker/workflow'
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

  useEffect(() => {
    if (visible && !selectedNode) {
      onClose()
    }
  }, [selectedNode, visible, onClose])

  const tabs: DrawerTab[] = useMemo(
    () => [
      {
        id: 'settings',
        label: '设置',
        icon: Settings,
        content: <PropertyPanel />,
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
    []
  )

  const actions: DrawerAction[] = useMemo(
    () => [
      {
        id: 'run',
        icon: Play,
        label: '运行此节点',
        onClick: () => selectedNode && onRunNode?.(selectedNode.id),
        disabled: !selectedNode || !onRunNode,
        variant: 'success',
      },
      {
        id: 'locate',
        icon: Crosshair,
        label: '定位到此节点',
        onClick: () => selectedNode && onLocateNode?.(selectedNode.id),
        disabled: !selectedNode || !onLocateNode,
        variant: 'primary',
      },
    ],
    [selectedNode, onRunNode, onLocateNode]
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
