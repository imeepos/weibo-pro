import React from 'react'
import { useCallback, useRef } from 'react'
import { Subject } from 'rxjs'
import type { useWorkflow } from '../../hooks/useWorkflow'
import type { ToastType } from './useCanvasState'
import {
  useRunNodeOperations,
  useRunWorkflowOperations,
  useSaveWorkflowOperations,
  type WorkflowOperationsCallbacks,
  type WorkflowOperationRefs,
} from './workflow-operations'

export type { WorkflowOperationsCallbacks, WorkflowOperationRefs } from './workflow-operations'

/**
 * 工作流画布操作 Hook（组合层）
 *
 * 职责：组合单节点执行、整工作流执行/取消、工作流保存三类操作。
 * 具体实现按职责拆分到 workflow-operations/ 子目录：
 * - useRunNodeOperations：runNode / runNodeIsolated
 * - useRunWorkflowOperations：runWorkflow / cancelWorkflow
 * - useSaveWorkflowOperations：saveWorkflow / saveSubWorkflow
 *
 * 本文件仅负责：
 * - 统一创建共享 Ref（取消 Subject、AbortController、执行记录、执行锁）
 * - 调用子 hooks 组合返回结果
 * - 页面生命周期监听（路由切换、刷新、关闭时自动取消执行）
 *
 * 公开 API 与拆分前完全一致。
 */
export function useWorkflowOperations(
  workflow: ReturnType<typeof useWorkflow>,
  callbacks?: {
    onShowToast?: (type: ToastType, title: string, message?: string) => void
    onSetRunning?: (running: boolean) => void
    onSetSaving?: (saving: boolean) => void
    getViewport?: () => { x: number; y: number; zoom: number }
  }
) {
  const operationsCallbacks: WorkflowOperationsCallbacks = callbacks || {}

  // 共享 Ref：取消 Subject、AbortController、节点执行记录、执行锁
  const refs: WorkflowOperationRefs = {
    cancelSubject$: useRef(new Subject<void>()),
    abortControllerRef: useRef<AbortController | null>(null),
    nodeRecordIds: useRef<Map<string, string>>(new Map()),
    isWorkflowRunningRef: useRef(false),
  }

  const { runNode, runNodeIsolated } = useRunNodeOperations(workflow, operationsCallbacks, refs)
  const { runWorkflow, cancelWorkflow } = useRunWorkflowOperations(workflow, operationsCallbacks, refs)
  const { saveWorkflow, saveSubWorkflow } = useSaveWorkflowOperations(workflow, operationsCallbacks)

  // 使用 useRef 存储 cancel 函数，避免 useEffect cleanup 频繁触发
  const cancelWorkflowRef = useRef(cancelWorkflow)
  React.useEffect(() => {
    cancelWorkflowRef.current = cancelWorkflow
  }, [cancelWorkflow])

  // 页面生命周期监听：处理路由切换、刷新、关闭等情况
  React.useEffect(() => {
    // 监听页面卸载（刷新、关闭浏览器）
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (refs.isWorkflowRunningRef.current) {
        // 提示用户有正在运行的工作流
        const message = '有工作流正在执行中，离开页面将取消执行。'
        event.returnValue = message
        return message
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // 组件卸载时（路由切换）自动取消工作流
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)

      // 路由切换时，如果有正在运行的工作流，自动取消
      if (refs.isWorkflowRunningRef.current) {
        cancelWorkflowRef.current()
      }
    }
  }, []) // 空依赖数组，只在组件挂载/卸载时执行

  return {
    runNode,
    runNodeIsolated,
    runWorkflow,
    cancelWorkflow,
    saveWorkflow,
    saveSubWorkflow,
  }
}
