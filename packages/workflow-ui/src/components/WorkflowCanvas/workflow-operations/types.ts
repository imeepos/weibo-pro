import type React from 'react'
import { Subject } from 'rxjs'
import type { IAstStates } from '@sker/workflow'
import type { ToastType } from '../useCanvasState'

/**
 * useWorkflowOperations 外部回调配置
 *
 * 与拆分前的 callbacks 参数保持完全一致。
 */
export interface WorkflowOperationsCallbacks {
  onShowToast?: (type: ToastType, title: string, message?: string) => void
  onSetRunning?: (running: boolean) => void
  onSetSaving?: (saving: boolean) => void
  getViewport?: () => { x: number; y: number; zoom: number }
}

/**
 * 执行相关的共享 Ref 集合
 *
 * 拆分后由主 hook 统一创建，传递给各子 hook，
 * 确保 cancel/abort/执行记录在多个操作间共享同一份状态。
 */
export interface WorkflowOperationRefs {
  /** 取消 Subject：emit 时通过 takeUntil 自动完成执行流 */
  cancelSubject$: React.MutableRefObject<Subject<void>>
  /** AbortController：用于取消异步操作 */
  abortControllerRef: React.MutableRefObject<AbortController | null>
  /** 节点执行记录 ID 映射（nodeId -> recordId） */
  nodeRecordIds: React.MutableRefObject<Map<string, string>>
  /** 工作流执行锁，防止重复执行 */
  isWorkflowRunningRef: React.MutableRefObject<boolean>
}

/**
 * 执行记录函数（来自 execution.store）
 */
export interface ExecutionRecordApi {
  recordNodeStart: (nodeId: string) => string
  recordNodeComplete: (
    nodeId: string,
    recordId: string,
    status: IAstStates,
    error?: { message: string },
    outputs?: Record<string, unknown>
  ) => void
}
