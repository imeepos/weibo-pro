'use client'

import { useMemo } from 'react'
import { useSelectionStore } from '../../store'
import { useWorkflowStore } from '../../store/workflow.store'
import type { WorkflowNode } from '../../types'

/**
 * 获取当前选中的节点（从 Zustand Store 获取，确保状态同步）
 */
export function useSelectedNode(): WorkflowNode | null {
  const selectedNodeId = useSelectionStore((state) => state.selectedNodeId)
  const nodes = useWorkflowStore((state) => state.nodes)

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null
    return nodes.find((node) => node.id === selectedNodeId) || null
  }, [selectedNodeId, nodes])

  return selectedNode
}
