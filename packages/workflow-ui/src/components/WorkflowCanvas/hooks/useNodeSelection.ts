import { useCallback } from 'react'
import type { WorkflowNode, WorkflowEdge } from '../../../types'
import type { UseWorkflowReturn } from '../../../hooks/useWorkflow'

/**
 * 节点选择工具子 Hook
 *
 * 提供选中节点及关联边的查询能力。
 */
export function useNodeSelection(workflow: UseWorkflowReturn) {
  // 获取选中的节点
  const getSelectedNodes = useCallback((): WorkflowNode[] => {
    return workflow.nodes.filter((node) => node.selected)
  }, [workflow.nodes])

  // 获取选中节点相关的边
  const getSelectedNodesEdges = useCallback((): WorkflowEdge[] => {
    const selectedNodeIds = new Set(
      workflow.nodes.filter((node) => node.selected).map((node) => node.id)
    )
    return workflow.edges.filter(
      (edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    )
  }, [workflow.nodes, workflow.edges])

  return { getSelectedNodes, getSelectedNodesEdges }
}
