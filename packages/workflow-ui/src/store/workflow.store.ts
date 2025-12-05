import { create } from 'zustand'
import type { WorkflowNode, WorkflowEdge } from '../types'
import { flowToAst } from '../adapters'
import { historyManager } from './history.store'

interface WorkflowState {
  /** 节点列表 */
  nodes: WorkflowNode[]
  /** 边列表 */
  edges: WorkflowEdge[]

  /** 设置节点 */
  setNodes: (nodes: WorkflowNode[] | ((currentNodes: WorkflowNode[]) => WorkflowNode[]), recordHistory?: boolean) => void
  /** 设置边 */
  setEdges: (edges: WorkflowEdge[] | ((currentEdges: WorkflowEdge[]) => WorkflowEdge[]), recordHistory?: boolean) => void

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

  /** 撤销 */
  undo: () => void
  /** 重做 */
  redo: () => void

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

  const recordHistory = () => {
    const { nodes, edges } = get()
    historyManager.push(nodes, edges)
  }

  return {
    ...initialState,

    setNodes: (nodes, shouldRecordHistory = true) => {
      if (typeof nodes === 'function') {
        return set((state) => {
          const newNodes = nodes(state.nodes)
          if (shouldRecordHistory) {
            setTimeout(() => recordHistory(), 0)
          }
          return { nodes: newNodes }
        }, false)
      } else {
        const safeNodes = Array.isArray(nodes) ? nodes : []
        if (!Array.isArray(nodes)) {
          console.error('[WorkflowStore] Invalid nodes passed to setNodes:', nodes)
        }
        if (shouldRecordHistory) {
          setTimeout(() => recordHistory(), 0)
        }
        return set({ nodes: safeNodes }, false)
      }
    },

    setEdges: (edges, shouldRecordHistory = true) => {
      if (typeof edges === 'function') {
        return set((state) => {
          const newEdges = edges(state.edges)
          if (shouldRecordHistory) {
            setTimeout(() => recordHistory(), 0)
          }
          return { edges: newEdges }
        }, false)
      } else {
        const safeEdges = Array.isArray(edges) ? edges : []
        if (!Array.isArray(edges)) {
          console.error('[WorkflowStore] Invalid edges passed to setEdges:', edges)
        }
        if (shouldRecordHistory) {
          setTimeout(() => recordHistory(), 0)
        }
        return set({ edges: safeEdges }, false)
      }
    },

    addNode: (node) => {
      set((state) => ({ nodes: [...state.nodes, node] }))
      recordHistory()
    },

    removeNode: (nodeId) => {
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        ),
      }))
      recordHistory()
    },

    updateNode: (nodeId, updates) => {
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...updates } }
            : node
        ),
      }))
      recordHistory()
    },

    addEdge: (edge) => {
      set((state) => ({ edges: [...state.edges, edge] }))
      recordHistory()
    },

    removeEdge: (edgeId) => {
      set((state) => ({
        edges: state.edges.filter((e) => e.id !== edgeId),
      }))
      recordHistory()
    },

    undo: () => {
      const snapshot = historyManager.undo()
      if (snapshot) {
        set({ nodes: snapshot.nodes, edges: snapshot.edges }, false)
      }
    },

    redo: () => {
      const snapshot = historyManager.redo()
      if (snapshot) {
        set({ nodes: snapshot.nodes, edges: snapshot.edges }, false)
      }
    },

    clear: () => {
      set({ nodes: [], edges: [] })
      historyManager.clear()
    },

    toAst: () => {
      const { nodes, edges } = get()
      return flowToAst(nodes, edges)
    },
  }
})
