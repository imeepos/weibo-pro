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
import { getNodeById, updateNodeReducer, WorkflowState, WorkflowEventBus, WorkflowEventType } from '@sker/workflow'
import { root } from '@sker/core'
import type { WorkflowNode, WorkflowEdge } from '../types'
import { flowToAst } from '../adapters'
import { astToFlowNodes, astToFlowEdges } from '../adapters/ast-to-flow'
import { historyManager } from './history.store'
import { NodeExecutionManager } from '../services/node-execution-manager'

interface IWorkflowState {
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
export const useWorkflowStore = create<IWorkflowState>()(
  immer((set, get) => {
    // ✨ 获取核心服务（单例）
    const workflowState = root.get(WorkflowState)
    const eventBus = root.get(WorkflowEventBus)
    const nodeExecutionManager = root.get(NodeExecutionManager)

    const recordHistory = () => {
      const { nodes, edges } = get()
      historyManager.push(nodes, edges)
    }

    // 🔧 监听节点执行完成事件，同步节点状态到前端 store
    eventBus.ofType(
      WorkflowEventType.NODE_SUCCESS,
      WorkflowEventType.NODE_FAIL
    ).subscribe(event => {
        if (!event.nodeId || !event.payload) {
          return
        }

        const { workflowAst } = get()
        if (!workflowAst) {
          return
        }

        // ✨ 确保 event.nodeId 是 string 类型（TypeScript 类型守卫）
        const nodeId: string = event.nodeId

        // 提取完整的节点数据（包括 input、output 等执行后的状态）
        const updates = event.type === WorkflowEventType.NODE_SUCCESS
          ? (() => {
              // NODE_SUCCESS: payload 是完整的节点对象
              const { state, ...nodeData } = event.payload
              return { ...nodeData, state: 'success' as const }
            })()
          : { state: 'fail' as const, error: event.payload }

        // 使用现有的 updateNode 逻辑更新 AST 和 React Flow
        set((draft) => {
          draft.workflowAst = updateNodeReducer(draft.workflowAst!, {
            nodeId,
            updates
          })

          // 同步到 React Flow
          const flowNodeIndex = draft.nodes.findIndex(n => n.id === nodeId)
          if (flowNodeIndex !== -1) {
            const updatedNode = getNodeById(draft.workflowAst!.nodes, nodeId)
            if (updatedNode && draft.nodes[flowNodeIndex]) {
              draft.nodes[flowNodeIndex].data = updatedNode
            }
          }

          draft.hasUnsavedChanges = true
        })
      })

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

        // ✨ 初始化 WorkflowState
        workflowState.init(ast)
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
       * ✨ 更新节点（核心方法 - 细粒度事件驱动）
       *
       * 优雅设计：
       * 1. 获取更新前的节点状态
       * 2. 使用 updateNodeReducer 更新 AST（前后端共享逻辑）
       * 3. 发射 NODE_UPDATED 事件（携带状态信息）
       * 4. 根据节点状态决定行为：
       *    - running → 取消并重新执行
       *    - pending → 只更新参数
       *    - success/fail → 标记为待重执行（手动触发）
       */
      updateNode: (nodeId: string, updates: Partial<INode>) => {
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

        const previousState = node.state

        // ✨ 2. 使用 updateNodeReducer 更新 AST
        set((draft) => {
          draft.workflowAst = updateNodeReducer(draft.workflowAst!, {
            nodeId,
            updates
          })

          // 同步到 React Flow
          const flowNodeIndex = draft.nodes.findIndex(n => n.id === nodeId)
          if (flowNodeIndex !== -1) {
            const updatedNode = getNodeById(draft.workflowAst!.nodes, nodeId)
            if (updatedNode && draft.nodes[flowNodeIndex]) {
              draft.nodes[flowNodeIndex].data = updatedNode
            }
          }

          draft.hasUnsavedChanges = true
        })

        const updatedNode = getNodeById(get().workflowAst!.nodes, nodeId)!
        const currentState = updatedNode.state

        // ✨ 3. 发射细粒度事件
        eventBus.next({
          type: WorkflowEventType.NODE_UPDATED,
          nodeId,
          workflowId: workflowAst.id,
          payload: {
            updates,
            previousState,
            currentState
          },
          timestamp: Date.now()
        })

        // ✨ 4. 根据节点状态决定行为
        const isRunning = nodeExecutionManager.isNodeRunning(nodeId)

        if (previousState === 'running' || isRunning) {
          // 节点正在执行 → 取消并重新执行
          nodeExecutionManager.cancelNode(nodeId)

          // 延迟重新执行，确保取消完成
          setTimeout(() => {
            nodeExecutionManager.executeNode(get().workflowAst!, nodeId)
          }, 100)
        } else if (previousState === 'pending') {
          // 节点尚未执行 → 只更新参数，不执行
        } else if (previousState === 'success' || previousState === 'fail') {
          // 节点已完成 → 标记为待重执行（不自动执行）
          // 可以在UI显示一个"重新执行"按钮
        }

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
        const { workflowAst } = get()
        // ✨ 直接返回 workflowAst（单一数据源）
        // workflowAst 已经通过事件监听自动同步了执行后的节点状态
        if (workflowAst) {
          return workflowAst
        }

        // 回退：如果 workflowAst 不存在，从 React Flow 数据重新构建
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

