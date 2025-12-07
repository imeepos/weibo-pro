/**
 * Workflow 状态管理 Store
 *
 * ✨ 重构升级：
 * 1. 使用 Immer 中间件确保不可变性
 * 2. 将 workflowAst 整合到 store（单一数据源）
 * 3. 类型安全的 actions
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { WorkflowGraphAst, INode } from '@sker/workflow'
import { getNodeById } from '@sker/workflow'
import type { WorkflowNode, WorkflowEdge } from '../types'
import { flowToAst } from '../adapters'
import { astToFlowNodes, astToFlowEdges } from '../adapters/ast-to-flow'
import { historyManager } from './history.store'

interface WorkflowState {
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
export const useWorkflowStore = create<WorkflowState>()(
  immer((set, get) => {
    const recordHistory = () => {
      const { nodes, edges } = get()
      historyManager.push(nodes, edges)
    }

    return {
      // ==================== Initial State ====================
      workflowAst: null,
      nodes: [],
      edges: [],
      hasUnsavedChanges: false,

      // ==================== Actions ====================

      initWorkflow: (ast: WorkflowGraphAst) => {
        set((draft) => {
          draft.workflowAst = ast
          draft.nodes = astToFlowNodes(ast)
          draft.edges = astToFlowEdges(ast)
          draft.hasUnsavedChanges = false
        })
      },

      setNodes: (nodes, shouldRecordHistory = true) => {
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
          setTimeout(() => recordHistory(), 0)
        }
      },

      setEdges: (edges, shouldRecordHistory = true) => {
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
          setTimeout(() => recordHistory(), 0)
        }
      },

      /**
       * ✨ 更新节点（关键方法）
       *
       * 策略：因为 AST 节点类可能有只读属性，我们需要创建新对象来替换
       * 1. 找到 AST 节点在数组中的索引
       * 2. 创建新的节点对象（保持原型链）
       * 3. 替换 workflowAst.nodes 中的节点
       * 4. 同步更新 React Flow nodes
       */
      updateNode: (nodeId: string, updates: Partial<INode>) => {
        set((draft) => {
          if (!draft.workflowAst) {
            console.warn('WorkflowAst not initialized')
            return
          }

          // ✨ 1. 找到节点索引
          const astNodeIndex = draft.workflowAst.nodes.findIndex(n => n.id === nodeId)
          if (astNodeIndex === -1) {
            console.warn(`Node ${nodeId} not found in AST`)
            return
          }

          const oldAstNode = draft.workflowAst.nodes[astNodeIndex]

          // ✨ 2. 创建新节点对象（保持原型链，避免只读属性问题）
          const newAstNode = Object.assign(
            Object.create(Object.getPrototypeOf(oldAstNode)),
            oldAstNode,
            updates
          )

          // ✨ 3. 替换 AST 数组中的节点（Immer 会自动处理不可变性）
          draft.workflowAst.nodes[astNodeIndex] = newAstNode

          // ✨ 4. 更新 React Flow 节点
          const flowNodeIndex = draft.nodes.findIndex(n => n.id === nodeId)
          if (flowNodeIndex !== -1) {
            const flowNode = draft.nodes[flowNodeIndex]
            if (flowNode) {
              flowNode.data = newAstNode
            }
          }

          // ✨ 5. 标记有未保存的更改
          draft.hasUnsavedChanges = true
        })

        recordHistory()
      },

      addNode: (node) => {
        set((draft) => {
          draft.nodes.push(node)
          draft.hasUnsavedChanges = true
        })
        recordHistory()
      },

      removeNode: (nodeId) => {
        set((draft) => {
          draft.nodes = draft.nodes.filter((n) => n.id !== nodeId)
          draft.edges = draft.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          )
          draft.hasUnsavedChanges = true
        })
        recordHistory()
      },

      addEdge: (edge) => {
        set((draft) => {
          draft.edges.push(edge)
          draft.hasUnsavedChanges = true
        })
        recordHistory()
      },

      removeEdge: (edgeId) => {
        set((draft) => {
          draft.edges = draft.edges.filter((e) => e.id !== edgeId)
          draft.hasUnsavedChanges = true
        })
        recordHistory()
      },

      syncFromAst: () => {
        set((draft) => {
          if (!draft.workflowAst) return
          draft.nodes = astToFlowNodes(draft.workflowAst)
          draft.edges = astToFlowEdges(draft.workflowAst)
        })
      },

      undo: () => {
        const snapshot = historyManager.undo()
        if (snapshot) {
          set((draft) => {
            draft.nodes = snapshot.nodes
            draft.edges = snapshot.edges
          })
        }
      },

      redo: () => {
        const snapshot = historyManager.redo()
        if (snapshot) {
          set((draft) => {
            draft.nodes = snapshot.nodes
            draft.edges = snapshot.edges
          })
        }
      },

      clear: () => {
        set((draft) => {
          draft.nodes = []
          draft.edges = []
          draft.workflowAst = null
          draft.hasUnsavedChanges = false
        })
        historyManager.clear()
      },

      markAsSaved: () => {
        set((draft) => {
          draft.hasUnsavedChanges = false
        })
      },

      toAst: () => {
        const { nodes, edges } = get()
        return flowToAst(nodes, edges)
      },
    }
  })
)

/**
 * ✨ Selector Hooks（性能优化）
 * 使用 selector 避免不必要的重新渲染
 */

/** 获取工作流 AST */
export const useWorkflowAst = () => useWorkflowStore((state) => state.workflowAst)

/** 获取是否有未保存的更改 */
export const useHasUnsavedChanges = () => useWorkflowStore((state) => state.hasUnsavedChanges)

