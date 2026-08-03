import { useMemo } from 'react'
import type { WorkflowOperations } from '../../context/workflow-operations'
import type { UseWorkflowReturn } from '../../hooks/useWorkflow'

/**
 * 构建 WorkflowOperations 上下文值
 *
 * 提供给 WorkflowOperationsContext.Provider，供 Renderer 通过
 * useWorkflowOperations() 访问工作流操作。
 */
export function useCanvasWorkflowOps(
  workflow: UseWorkflowReturn,
  openSubWorkflowModal: (params: { nodeId?: string; workflowAst?: any }) => void,
  onNodeClick: (event: React.MouseEvent, node: any) => void
): WorkflowOperations {
  return useMemo(() => ({
    toggleGroupCollapse: workflow.toggleGroupCollapse,
    openSubWorkflow: (nodeId, workflowAst) => {
      openSubWorkflowModal({ nodeId, workflowAst })
    },
    selectNode: (nodeId) => {
      const targetNode = workflow.nodes.find(n => n.id === nodeId)
      if (targetNode && onNodeClick) {
        const mouseEvent = new MouseEvent('click') as unknown as React.MouseEvent
        onNodeClick(mouseEvent, targetNode)
      }
    }
  }), [workflow, openSubWorkflowModal, onNodeClick])
}
