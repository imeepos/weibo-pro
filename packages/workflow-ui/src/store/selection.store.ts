import { create } from 'zustand'

interface SelectionState {
  /** 选中的节点 ID */
  selectedNodeId: string | null
  /** 选中的边 ID */
  selectedEdgeId: string | null

  /** 选择节点 */
  selectNode: (nodeId: string | null) => void
  /** 选择边 */
  selectEdge: (edgeId: string | null) => void
  /** 清空选择 */
  clearSelection: () => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,

  selectNode: (nodeId) =>
    set({ selectedNodeId: nodeId, selectedEdgeId: null }),

  selectEdge: (edgeId) =>
    set({ selectedEdgeId: edgeId, selectedNodeId: null }),

  clearSelection: () =>
    set({ selectedNodeId: null, selectedEdgeId: null }),
}))
