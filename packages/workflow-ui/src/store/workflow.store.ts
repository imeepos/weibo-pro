/**
 * Workflow 状态管理 Store
 *
 * ✨ 重构升级：
 * 1. 使用 Immer 中间件确保不可变性
 * 2. 将 workflowAst 整合到 store（单一数据源）
 * 3. 类型安全的 actions
 * 4. Actions 拆分至 workflow-store-actions.ts
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { WorkflowGraphAst, INode } from '@sker/workflow'
import type { WorkflowNode, WorkflowEdge } from '../types'
import { flowToAst } from '../adapters'
import {
  initWorkflowAction,
  setNodesAction,
  setEdgesAction,
  updateNodeAction,
  addNodeAction,
  removeNodeAction,
  addEdgeAction,
  removeEdgeAction,
  syncFromAstAction,
  undoAction,
  redoAction,
  clearAction,
  markAsSavedAction,
  toAstAction,
} from './workflow-store-actions'

export interface IWorkflowState {
  /** ✨ 工作流 AST（单一数据源） */
  workflowAst: WorkflowGraphAst | null

  /** 节点列表（派生自 AST） */
  nodes: WorkflowNode[]

  /** 边列表（派生自 AST） */
  edges: WorkflowEdge[]

  /** 是否有未保存的更改 */
  hasUnsavedChanges: boolean

  /** 初始化工作流 */
  initWorkflow: (ast: WorkflowGraphAst) => void

  /** 设置节点 */
  setNodes: (nodes: WorkflowNode[] | ((currentNodes: WorkflowNode[]) => WorkflowNode[]), recordHistory?: boolean) => void

  /** 设置边 */
  setEdges: (edges: WorkflowEdge[] | ((currentEdges: WorkflowEdge[]) => WorkflowEdge[]), recordHistory?: boolean) => void

  /** ✨ 更新节点（确保 AST 和 React Flow 同步） */
  updateNode: (nodeId: string, updates: Partial<INode>) => void

  /** 添加节点 */
  addNode: (node: WorkflowNode) => void

  /** 删除节点 */
  removeNode: (nodeId: string) => void

  /** 添加边 */
  addEdge: (edge: WorkflowEdge) => void

  /** 删除边 */
  removeEdge: (edgeId: string) => void

  /** 从 AST 同步到 React Flow */
  syncFromAst: () => void

  /** 撤销 */
  undo: () => void

  /** 重做 */
  redo: () => void

  /** 清空工作流 */
  clear: () => void

  /** 标记为已保存 */
  markAsSaved: () => void

  /** 获取 Ast 格式数据 */
  toAst: () => ReturnType<typeof flowToAst>
}

/**
 * ✨ 使用 Immer 中间件：
 * - 在 set 函数中可以直接"修改" draft state
 * - Immer 会自动创建新对象，确保不可变性
 */
export const useWorkflowStore: {
  (): IWorkflowState
  <T>(selector: (state: IWorkflowState) => T): T
} = create<IWorkflowState>()(
  immer((set, get) => ({
    // ==================== Initial State ====================
    workflowAst: null,
    nodes: [],
    edges: [],
    hasUnsavedChanges: false,

    // ==================== Actions ====================
    initWorkflow: (ast) => initWorkflowAction(set, ast),

    setNodes: (nodes, recordHistory = true) => setNodesAction(set, get, nodes, recordHistory),

    setEdges: (edges, recordHistory = true) => setEdgesAction(set, get, edges, recordHistory),

    updateNode: (nodeId, updates) => updateNodeAction(set, get, nodeId, updates),

    addNode: (node) => addNodeAction(set, get, node),

    removeNode: (nodeId) => removeNodeAction(set, get, nodeId),

    addEdge: (edge) => addEdgeAction(set, get, edge),

    removeEdge: (edgeId) => removeEdgeAction(set, get, edgeId),

    syncFromAst: () => syncFromAstAction(set),

    undo: () => undoAction(set),

    redo: () => redoAction(set),

    clear: () => clearAction(set),

    markAsSaved: () => markAsSavedAction(set),

    toAst: () => toAstAction(get),
  }))
)

/**
 * ✨ Selector Hooks（性能优化）
 * 使用 selector 避免不必要的重新渲染
 */

/** 获取工作流 AST */
export const useWorkflowAst = () => useWorkflowStore((state) => state.workflowAst)

/** 获取是否有未保存的更改 */
export const useHasUnsavedChanges = () => useWorkflowStore((state) => state.hasUnsavedChanges)
