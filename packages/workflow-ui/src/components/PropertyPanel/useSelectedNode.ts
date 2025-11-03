'use client'

import { useMemo } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useSelectionStore } from '../../store'
import type { WorkflowNode } from '../../types'

/**
 * 获取当前选中的节点
 */
export function useSelectedNode(): WorkflowNode | null {
  const selectedNodeId = useSelectionStore((state) => state.selectedNodeId)
  const { getNodes } = useReactFlow()

  return useMemo(() => {
    if (!selectedNodeId) return null
    const nodes = getNodes() as WorkflowNode[]
    return nodes.find((node) => node.id === selectedNodeId) || null
  }, [selectedNodeId, getNodes])
}
