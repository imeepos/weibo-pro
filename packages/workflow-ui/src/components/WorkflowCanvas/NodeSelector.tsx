'use client'

import React from 'react'
import { WorkflowNodeSelector } from '@sker/ui/components/workflow'
import { useNodeRegistry } from '../NodePalette/useNodeRegistry'
import type { NodeMetadata } from '../../types'

export interface NodeSelectorProps {
  visible: boolean
  position: { x: number; y: number }
  onSelect: (metadata: NodeMetadata) => void
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
  const nodeRegistry = useNodeRegistry()

  // 将业务数据适配为展示层格式
  const nodes = nodeRegistry.map((metadata) => ({
    type: metadata.type,
    label: metadata.label,
    inputs: metadata.inputs,
    outputs: metadata.outputs,
  }))

  const handleSelect = (node: any) => {
    const metadata = nodeRegistry.find((m) => m.type === node.type)
    if (metadata) {
      onSelect(metadata)
    }
  }

  return (
    <WorkflowNodeSelector
      visible={visible}
      position={position}
      nodes={nodes}
      onSelect={handleSelect}
      onClose={onClose}
    />
  )
}
