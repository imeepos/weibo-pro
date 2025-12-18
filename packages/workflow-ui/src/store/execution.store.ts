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

/** 流式数据 */
export interface StreamingData {
  delta: string
  accumulated: string
  timestamp: number
}

/** 节点进度数据 */
export interface NodeProgressData {
  stage: string
  message: string
  round?: number
  status?: 'executing' | 'completed'
  timestamp: number
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
  /** 节点流式数据（实时更新） */
  streamingData: Record<string, StreamingData>
  /** 节点进度数据（工具调用、阶段性任务） */
  nodeProgress: Record<string, NodeProgressData>

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

  /** 更新节点流式数据 */
  updateStreamingData: (nodeId: string, delta: string, accumulated: string) => void
  /** 清空节点流式数据 */
  clearStreamingData: (nodeId: string) => void

  /** 更新节点进度 */
  updateNodeProgress: (nodeId: string, progress: Omit<NodeProgressData, 'timestamp'>) => void
  /** 清空节点进度 */
  clearNodeProgress: (nodeId: string) => void

  /** 重置执行状态 */
  resetExecution: () => void
}

const MAX_HISTORY_PER_NODE = 20
let recordIdCounter = 0

const generateRecordId = (nodeId: string) => {
  recordIdCounter++
  return `${nodeId}-${Date.now()}-${recordIdCounter}`
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  isExecuting: false,
  executionError: null,
  nodeStates: {},
  nodeHistory: {},
  streamingData: {},
  nodeProgress: {},

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
    const recordId = generateRecordId(nodeId)
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

  updateStreamingData: (nodeId, delta, accumulated) =>
    set((prev) => ({
      streamingData: {
        ...prev.streamingData,
        [nodeId]: { delta, accumulated, timestamp: Date.now() },
      },
    })),

  clearStreamingData: (nodeId) =>
    set((prev) => {
      const { [nodeId]: _, ...rest } = prev.streamingData
      return { streamingData: rest }
    }),

  updateNodeProgress: (nodeId, progress) =>
    set((prev) => {
      console.log('[ExecutionStore] updateNodeProgress', { nodeId, progress });
      return {
        nodeProgress: {
          ...prev.nodeProgress,
          [nodeId]: { ...progress, timestamp: Date.now() },
        },
      };
    }),

  clearNodeProgress: (nodeId) =>
    set((prev) => {
      const { [nodeId]: _, ...rest } = prev.nodeProgress
      return { nodeProgress: rest }
    }),

  resetExecution: () =>
    set({
      isExecuting: false,
      executionError: null,
      nodeStates: {},
      nodeHistory: {},
      streamingData: {},
      nodeProgress: {}
    }),
}))
