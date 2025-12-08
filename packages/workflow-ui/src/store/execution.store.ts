import { create } from 'zustand'
import type { IAstStates } from '@sker/workflow'

/** 节点执行记录 */
export interface NodeExecutionRecord {
  id: string
  nodeId: string
  status: IAstStates
  startedAt: Date
  completedAt?: Date
  error?: { message: string }
  outputs?: Record<string, unknown>
}

interface ExecutionState {
  /** 是否正在执行 */
  isExecuting: boolean
  /** 执行错误 */
  executionError: Error | null
  /** 节点执行状态映射 */
  nodeStates: Record<string, IAstStates>
  /** 节点执行历史（按节点ID分组） */
  nodeHistory: Record<string, NodeExecutionRecord[]>

  /** 开始执行 */
  startExecution: () => void
  /** 完成执行 */
  finishExecution: () => void
  /** 执行失败 */
  failExecution: (error: Error) => void

  /** 更新节点状态 */
  updateNodeState: (nodeId: string, state: IAstStates) => void
  /** 批量更新节点状态 */
  updateNodeStates: (states: Record<string, IAstStates>) => void

  /** 记录节点执行开始 */
  recordNodeStart: (nodeId: string) => string
  /** 记录节点执行完成 */
  recordNodeComplete: (nodeId: string, recordId: string, status: IAstStates, error?: { message: string }, outputs?: Record<string, unknown>) => void
  /** 获取节点执行历史 */
  getNodeHistory: (nodeId: string) => NodeExecutionRecord[]

  /** 重置执行状态 */
  resetExecution: () => void
}

const MAX_HISTORY_PER_NODE = 20

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  isExecuting: false,
  executionError: null,
  nodeStates: {},
  nodeHistory: {},

  startExecution: () =>
    set({ isExecuting: true, executionError: null }),

  finishExecution: () =>
    set({ isExecuting: false }),

  failExecution: (error) =>
    set({ isExecuting: false, executionError: error }),

  updateNodeState: (nodeId, state) =>
    set((prev) => ({
      nodeStates: { ...prev.nodeStates, [nodeId]: state },
    })),

  updateNodeStates: (states) =>
    set((prev) => ({
      nodeStates: { ...prev.nodeStates, ...states },
    })),

  recordNodeStart: (nodeId) => {
    const recordId = `${nodeId}-${Date.now()}`
    const record: NodeExecutionRecord = {
      id: recordId,
      nodeId,
      status: 'running',
      startedAt: new Date(),
    }
    set((prev) => {
      const history = prev.nodeHistory[nodeId] || []
      return {
        nodeHistory: {
          ...prev.nodeHistory,
          [nodeId]: [record, ...history].slice(0, MAX_HISTORY_PER_NODE),
        },
      }
    })
    return recordId
  },

  recordNodeComplete: (nodeId, recordId, status, error, outputs) => {
    set((prev) => {
      const history = prev.nodeHistory[nodeId] || []
      return {
        nodeHistory: {
          ...prev.nodeHistory,
          [nodeId]: history.map((r) =>
            r.id === recordId
              ? { ...r, status, completedAt: new Date(), error, outputs }
              : r
          ),
        },
      }
    })
  },

  getNodeHistory: (nodeId) => get().nodeHistory[nodeId] || [],

  resetExecution: () =>
    set({ isExecuting: false, executionError: null, nodeStates: {} }),
}))
