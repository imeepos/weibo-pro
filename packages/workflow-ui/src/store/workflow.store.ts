import { create } from 'zustand'
import type { WorkflowNode, WorkflowEdge } from '../types'
import { flowToAst } from '../adapters'

interface WorkflowState {
  /** 节点列表 */
  nodes: WorkflowNode[]
  /** 边列表 */
  edges: WorkflowEdge[]

  /** 设置节点 */
  setNodes: (nodes: WorkflowNode[] | ((currentNodes: WorkflowNode[]) => WorkflowNode[])) => void
  /** 设置边 */
  setEdges: (edges: WorkflowEdge[] | ((currentEdges: WorkflowEdge[]) => WorkflowEdge[])) => void

  /** 添加节点 */
  addNode: (node: WorkflowNode) => void
  /** 删除节点 */
  removeNode: (nodeId: string) => void
  /** 更新节点 */
  updateNode: (nodeId: string, updates: Partial<WorkflowNode['data']>) => void

  /** 添加边 */
  addEdge: (edge: WorkflowEdge) => void
  /** 删除边 */
  removeEdge: (edgeId: string) => void

  /** 清空工作流 */
  clear: () => void

  /** 获取 Ast 格式数据 */
  toAst: () => ReturnType<typeof flowToAst>
}

export const useWorkflowStore = create<WorkflowState>((set, get) => {
  const initialState = {
    nodes: [] as WorkflowNode[],
    edges: [] as WorkflowEdge[],
  }

  
  return {
    ...initialState,

  setNodes: (nodes) => {
      if (typeof nodes === 'function') {
        // 函数式更新：调用函数并传入当前状态，优化性能
        return set((state) => ({ nodes: nodes(state.nodes) }), false)
      } else {
        // 直接设置数组
        const safeNodes = Array.isArray(nodes) ? nodes : []
        if (!Array.isArray(nodes)) {
          console.error('[WorkflowStore] Invalid nodes passed to setNodes:', nodes)
        }
        return set({ nodes: safeNodes }, false)
      }
    },
  setEdges: (edges) => {
      if (typeof edges === 'function') {
        // 函数式更新：调用函数并传入当前状态
        return set((state) => ({ edges: edges(state.edges) }), false)
      } else {
        // 直接设置数组
        const safeEdges = Array.isArray(edges) ? edges : []
        if (!Array.isArray(edges)) {
          console.error('[WorkflowStore] Invalid edges passed to setEdges:', edges)
        }
        return set({ edges: safeEdges }, false)
      }
    },

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
    })),

  updateNode: (nodeId, updates) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      ),
    })),

  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),

  removeEdge: (edgeId) =>
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    })),

  clear: () => set({ nodes: [], edges: [] }),

  toAst: () => {
    const { nodes, edges } = get()
    return flowToAst(nodes, edges)
  },
  }
})
