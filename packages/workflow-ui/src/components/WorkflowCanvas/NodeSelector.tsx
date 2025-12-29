'use client'

import React, { useMemo } from 'react'
import { WorkflowNodeSelector } from '@sker/ui/components/workflow'
import { useNodeRegistry } from '../NodePalette/useNodeRegistry'
import { getNodeMetadata } from '../../adapters'
import type { UINodeMetadata } from '../../types'

export interface NodeSelectorProps {
  visible: boolean
  position: { x: number; y: number }
  onSelect: (metadata: UINodeMetadata) => void
  onClose: () => void
}

/**
 * 节点选择器适配器
 *
 * 职责：
 * - 从业务层获取节点注册表数据
 * - 将数据适配为纯展示组件所需的格式
 * - 将选择事件转换回业务层格式
 */
export function NodeSelector({
  visible,
  position,
  onSelect,
  onClose,
}: NodeSelectorProps) {
  const compiledRegistry = useNodeRegistry()

  // 转换为 UI 元数据
  const uiRegistry = useMemo(() =>
    compiledRegistry.map(compiled => {
      const tempNode = { type: compiled.type, metadata: compiled } as any
      return getNodeMetadata(tempNode)
    }),
    [compiledRegistry]
  )

  const handleSelect = (node: any) => {
    const metadata = uiRegistry.find((m) => m.type === node.type)
    if (metadata) {
      onSelect(metadata)
    }
  }

  return (
    <WorkflowNodeSelector
      visible={visible}
      position={position}
      nodes={uiRegistry}
      onSelect={handleSelect}
      onClose={onClose}
    />
  )
}
