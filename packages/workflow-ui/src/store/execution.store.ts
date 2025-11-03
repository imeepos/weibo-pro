import { create } from 'zustand'
import type { IAstStates } from '@sker/workflow'

interface ExecutionState {
  /** 是否正在执行 */
  isExecuting: boolean
  /** 执行错误 */
  executionError: Error | null
  /** 节点执行状态映射 */
  nodeStates: Record<string, IAstStates>

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

  /** 重置执行状态 */
  resetExecution: () => void
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  isExecuting: false,
  executionError: null,
  nodeStates: {},

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

  resetExecution: () =>
    set({ isExecuting: false, executionError: null, nodeStates: {} }),
}))
