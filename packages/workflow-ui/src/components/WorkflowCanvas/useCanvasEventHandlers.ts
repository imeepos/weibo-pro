import { useCallback } from 'react'
import { useEventHandlers } from './hooks/useEventHandlers'
import type { UseWorkflowReturn } from '../../hooks/useWorkflow'

export interface UseCanvasEventHandlersParams {
  workflow: UseWorkflowReturn
  openSubWorkflowModal: (params: { nodeId?: string; workflowAst?: any }) => void
  openSettingPanel: (params: { nodeId?: string; nodeData?: any }) => void
  openEdgeConfigDialog: (edge: any) => void
  openDrawer: (nodeId?: string) => void
  copyNodes: () => void
  pasteNodes: (position?: { x: number; y: number }) => void
}

/**
 * 画布自定义事件委托 Hook
 *
 * 统一配置 useEventHandlers，将节点/边组件通过 window 自定义事件
 * 触发的操作（删除、打开子工作流、打开设置面板等）映射到业务逻辑。
 */
export function useCanvasEventHandlers({
  workflow,
  openSubWorkflowModal,
  openSettingPanel,
  openEdgeConfigDialog,
  openDrawer,
  copyNodes,
  pasteNodes,
}: UseCanvasEventHandlersParams) {
  useEventHandlers({
    onEdgeDelete: useCallback((edgeId: string) => {
      const edge = workflow.edges.find((e) => e.id === edgeId)
      if (edge) {
        workflow.removeEdge(edge)
      }
    }, [workflow]),

    onOpenSubWorkflow: useCallback((nodeId: string, workflowAst: any) => {
      openSubWorkflowModal({ nodeId, workflowAst })
    }, [openSubWorkflowModal]),

    onOpenSettingPanel: useCallback((nodeId: string, nodeData: any) => {
      openSettingPanel({ nodeId, nodeData })
    }, [openSettingPanel]),

    onOpenEdgeConfig: useCallback((edgeId: string) => {
      const edge = workflow.edges.find((e) => e.id === edgeId)
      if (edge?.data?.edge) {
        openEdgeConfigDialog(edge.data.edge)
      }
    }, [workflow.edges, openEdgeConfigDialog]),

    onNodeDoubleClick: useCallback((nodeId: string) => {
      openDrawer(nodeId)
    }, [openDrawer]),

    onNodeDuplicate: useCallback((nodeId: string) => {
      // 选中当前节点并复制
      workflow.setNodes((nodes) =>
        nodes.map((n) => ({ ...n, selected: n.id === nodeId }))
      )
      copyNodes()
      // 立即粘贴到原位置附近
      const node = workflow.nodes.find((n) => n.id === nodeId)
      if (node) {
        const offsetPosition = { x: node.position.x + 50, y: node.position.y + 50 }
        pasteNodes(offsetPosition)
      }
    }, [workflow, copyNodes, pasteNodes]),

    onNodeDelete: useCallback((nodeId: string) => {
      workflow.removeNode(nodeId)
    }, [workflow]),
  })
}
