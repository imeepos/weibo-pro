/**
 * Workflow Store 的 Actions 实现
 *
 * 从 workflow.store.ts 中拆分出来，保持行为完全一致。
 * set: zustand/immer 的 set（可在 draft 上直接修改）
 * get: zustand 的 get（读取当前 state）
 */
import type { WorkflowGraphAst, INode } from '@sker/workflow'
import { getNodeById } from '@sker/workflow'
import type { WorkflowNode, WorkflowEdge } from '../types'
import { flowToAst } from '../adapters'
import { astToFlowNodes, astToFlowEdges } from '../adapters/ast-to-flow'
import { historyManager } from './history.store'

export type StoreSet = (fn: (draft: any) => void) => void
export type StoreGet = () => any

export const recordHistory = (get: StoreGet) => {
  const { nodes, edges } = get()
  historyManager.push(nodes, edges)
}

export const initWorkflowAction = (set: StoreSet, ast: WorkflowGraphAst) => {
  set((draft) => {
    draft.workflowAst = ast
    draft.nodes = astToFlowNodes(ast)
    draft.edges = astToFlowEdges(ast)
    draft.hasUnsavedChanges = false
  })
}

export const setNodesAction = (
  set: StoreSet,
  get: StoreGet,
  nodes: WorkflowNode[] | ((currentNodes: WorkflowNode[]) => WorkflowNode[]),
  shouldRecordHistory = true
) => {
  if (typeof nodes === 'function') {
    set((draft) => {
      draft.nodes = nodes(draft.nodes)
    })
  } else {
    if (!Array.isArray(nodes)) {
      console.error('[WorkflowStore] Invalid nodes:', nodes)
      return
    }
    set((draft) => {
      draft.nodes = nodes
    })
  }

  if (shouldRecordHistory) {
    setTimeout(() => recordHistory(get), 0)
  }
}

export const setEdgesAction = (
  set: StoreSet,
  get: StoreGet,
  edges: WorkflowEdge[] | ((currentEdges: WorkflowEdge[]) => WorkflowEdge[]),
  shouldRecordHistory = true
) => {
  if (typeof edges === 'function') {
    set((draft) => {
      draft.edges = edges(draft.edges)
    })
  } else {
    if (!Array.isArray(edges)) {
      console.error('[WorkflowStore] Invalid edges:', edges)
      return
    }
    set((draft) => {
      draft.edges = edges
    })
  }

  if (shouldRecordHistory) {
    setTimeout(() => recordHistory(get), 0)
  }
}

export const updateNodeAction = (set: StoreSet, get: StoreGet, nodeId: string, updates: Partial<INode>) => {
  const { workflowAst } = get()
  if (!workflowAst) {
    console.warn('[WorkflowStore] WorkflowAst not initialized')
    return
  }

  // ✨ 1. 获取更新前的节点状态
  const node = getNodeById(workflowAst.nodes, nodeId)
  if (!node) {
    console.warn(`[WorkflowStore] Node ${nodeId} not found in AST`)
    return
  }

  const _previousState = node.state

  set((draft) => {
    // 同步到 React Flow
    const flowNodeIndex = draft.nodes.findIndex(n => n.id === nodeId)
    if (flowNodeIndex !== -1) {
      const updatedNode = getNodeById(draft.workflowAst!.nodes, nodeId)
      if (updatedNode && draft.nodes[flowNodeIndex]) {
        Object.assign(updatedNode, updates)
        draft.nodes[flowNodeIndex].data = updatedNode
      }
    }

    draft.hasUnsavedChanges = true
  })

  recordHistory(get)
}

export const addNodeAction = (set: StoreSet, get: StoreGet, node: WorkflowNode) => {
  set((draft) => {
    draft.nodes.push(node)
    draft.hasUnsavedChanges = true
  })
  recordHistory(get)
}

export const removeNodeAction = (set: StoreSet, get: StoreGet, nodeId: string) => {
  set((draft) => {
    draft.nodes = draft.nodes.filter((n: WorkflowNode) => n.id !== nodeId)
    draft.edges = draft.edges.filter(
      (e: WorkflowEdge) => e.source !== nodeId && e.target !== nodeId
    )
    draft.hasUnsavedChanges = true
  })
  recordHistory(get)
}

export const addEdgeAction = (set: StoreSet, get: StoreGet, edge: WorkflowEdge) => {
  set((draft) => {
    draft.edges.push(edge)
    draft.hasUnsavedChanges = true
  })
  recordHistory(get)
}

export const removeEdgeAction = (set: StoreSet, get: StoreGet, edgeId: string) => {
  set((draft) => {
    draft.edges = draft.edges.filter((e: WorkflowEdge) => e.id !== edgeId)
    draft.hasUnsavedChanges = true
  })
  recordHistory(get)
}

export const syncFromAstAction = (set: StoreSet) => {
  set((draft) => {
    if (!draft.workflowAst) return
    draft.nodes = astToFlowNodes(draft.workflowAst)
    draft.edges = astToFlowEdges(draft.workflowAst)
  })
}

export const undoAction = (set: StoreSet) => {
  const snapshot = historyManager.undo()
  if (snapshot) {
    set((draft) => {
      draft.nodes = snapshot.nodes
      draft.edges = snapshot.edges
    })
  }
}

export const redoAction = (set: StoreSet) => {
  const snapshot = historyManager.redo()
  if (snapshot) {
    set((draft) => {
      draft.nodes = snapshot.nodes
      draft.edges = snapshot.edges
    })
  }
}

export const clearAction = (set: StoreSet) => {
  set((draft) => {
    draft.nodes = []
    draft.edges = []
    draft.workflowAst = null
    draft.hasUnsavedChanges = false
  })
  historyManager.clear()
}

export const markAsSavedAction = (set: StoreSet) => {
  set((draft) => {
    draft.hasUnsavedChanges = false
  })
}

export const toAstAction = (get: StoreGet): ReturnType<typeof flowToAst> => {
  const { workflowAst } = get()
  // ✨ 直接返回 workflowAst（单一数据源）
  if (workflowAst) {
    return workflowAst
  }

  // 回退：如果 workflowAst 不存在，从 React Flow 数据重新构建
  const { nodes, edges } = get()
  return flowToAst(nodes, edges)
}
