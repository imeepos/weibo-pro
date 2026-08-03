import { useCallback } from 'react'
import { executeAst, fromJson, toJson, type WorkflowGraphAst, globalRuntime } from '@sker/workflow'
import { root } from '@sker/core'
import { WorkflowController } from '@sker/sdk'
import { Subject, takeUntil, finalize } from 'rxjs'
import { useExecutionStore } from '../../../store/execution.store'
import type { UseWorkflowReturn } from '../../../hooks/useWorkflow'
import type { WorkflowOperationsCallbacks, WorkflowOperationRefs } from './types'
import { extractErrorInfo, resetConnectedInputs } from './utils'
import { applyWorkflowRunEvent } from './run-events'

/**
 * 整个工作流执行 / 取消操作 Hook
 *
 * 职责：封装 runWorkflow / cancelWorkflow。
 * - Observable + takeUntil 实现优雅的取消机制
 * - Subject emit 触发取消，符合响应式编程范式
 * - 执行前后自动保存状态，确保数据持久化
 * - 自动统计执行结果，提供清晰反馈
 * - 防止重复执行：使用 isWorkflowRunning 标志位
 */
export function useRunWorkflowOperations(
  workflow: UseWorkflowReturn,
  callbacks: WorkflowOperationsCallbacks,
  refs: WorkflowOperationRefs
) {
  const { onShowToast, onSetRunning, getViewport } = callbacks
  const { cancelSubject$, abortControllerRef, isWorkflowRunningRef, nodeRecordIds } = refs
  const { recordNodeComplete } = useExecutionStore.getState()

  /**
   * 运行整个工作流
   *
   * 优雅设计：
   * - 利用 Observable + takeUntil 实现优雅的取消机制
   * - 通过 Subject emit 值来触发取消，符合响应式编程范式
   * - 执行前后自动保存状态，确保数据持久化
   * - 自动统计执行结果，提供清晰反馈
   * - 支持运行前配置输入参数，应用到对应节点
   * - 防止重复执行：使用 isWorkflowRunning 标志位
   */
  const runWorkflow = useCallback(
    async (inputs?: Record<string, unknown>, onComplete?: () => void) => {
      if (!workflow.workflowAst) {
        onShowToast?.('error', '工作流不存在', '无法执行空工作流')
        return
      }

      const nodes = workflow.nodes
      if (nodes.length === 0) {
        onShowToast?.('info', '没有节点可执行', '请先添加节点到画布')
        return
      }

      // 防止重复执行
      if (isWorkflowRunningRef.current) {
        onShowToast?.('info', '工作流正在执行中', '请等待当前执行完成')
        return
      }
      isWorkflowRunningRef.current = true

      const cleanup = () => {
        isWorkflowRunningRef.current = false
      }

      try {
        // 如果有正在运行的工作流，先取消
        if (abortControllerRef.current) {
          cancelSubject$.current.next()

          if (abortControllerRef.current) {
            abortControllerRef.current.abort()
          }

          onShowToast?.('info', '已取消上一次运行', '开始新的工作流执行')

          // 重置正在运行的节点状态（不可变方式），但保留输出字段
          workflow.workflowAst.nodes = workflow.workflowAst.nodes.map(node => {
            if (node.state === 'running') {
              // 保留输出字段
              const outputFields: Record<string, any> = {}
              node.metadata?.outputs?.forEach((output: any) => {
                if (node[output.property] !== undefined) {
                  outputFields[output.property] = node[output.property]
                }
              })

              return Object.assign(
                Object.create(Object.getPrototypeOf(node)),
                node,
                { state: 'pending', error: undefined, ...outputFields }
              )
            }
            return node
          })
          workflow.syncFromAst()
        }

        // 应用输入参数到对应节点
        console.log(`[runWorkflow] 接收到的 inputs:`, inputs)
        if (inputs && Object.keys(inputs).length > 0) {
          // 收集所有需要修改的节点更新（批量优化）
          const nodeUpdates = new Map<string, Record<string, any>>()

          Object.entries(inputs).forEach(([key, value]) => {
            // 跳过 undefined 值（保留节点默认值）
            if (value === undefined) {
              return
            }

            // key 格式: "nodeId.propertyKey"
            const dotIndex = key.indexOf('.')
            if (dotIndex === -1) {
              console.warn(`⚠️ 无效的输入键格式: ${key}`)
              return
            }

            const nodeId = key.substring(0, dotIndex)
            const propertyKey = key.substring(dotIndex + 1)

            if (!nodeUpdates.has(nodeId)) {
              nodeUpdates.set(nodeId, {})
            }
            nodeUpdates.get(nodeId)![propertyKey] = value
          })

          // 批量更新节点（不可变方式，避免修改只读对象）
          workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(node => {
            const updates = nodeUpdates.get(node.id)
            if (updates) {
              // 创建新节点对象，保持原型链
              return Object.assign(
                Object.create(Object.getPrototypeOf(node)),
                node,
                updates
              )
            }
            return node
          })

          // 同步到 React Flow
          workflow.syncFromAst()
        }

        // 执行前保存状态
        try {
          if (getViewport) {
            workflow.workflowAst.viewport = getViewport()
          }
          const controller = root.get<WorkflowController>(WorkflowController)
          await controller.saveWorkflow(workflow.workflowAst)
        } catch (error: any) {
          console.error('[runWorkflow] 执行前保存工作流失败:', error)
        }

        // 创建新的取消 Subject（重置上一次的）
        cancelSubject$.current = new Subject<void>()

        // 创建新的 AbortController
        const abortController = new AbortController()
        abortControllerRef.current = abortController

        // ✨ 重置有入边连接的输入属性，防止上一次运行结果影响当前运行
        resetConnectedInputs(workflow.workflowAst)

        // ✨ 重置所有节点状态为 pending（参考 reactive-scheduler.ts 的 resetWorkflowGraphAst）
        // 确保进度条从 0% 开始，但保留输出字段数据
        workflow.workflowAst.state = 'pending'
        workflow.workflowAst.nodes = workflow.workflowAst.nodes.map(node => {
          // 保留输出字段（qrcode, account, message 等）
          const outputFields: Record<string, any> = {}
          node.metadata?.outputs?.forEach((output: any) => {
            if (node[output.property] !== undefined) {
              outputFields[output.property] = node[output.property]
            }
          })

          return Object.assign(
            Object.create(Object.getPrototypeOf(node)),
            node,
            {
              state: 'pending',
              count: 0,
              emitCount: 0,
              error: undefined,
              ...outputFields
            }
          )
        })
        workflow.syncFromAst()

        // 🎬 开始录制事件（清空历史，开启存储）
        globalRuntime.startRecording()

        onSetRunning?.(true)

        // ✨ 深拷贝 AST：避免 Zustand + Immer 冻结对象导致的只读属性问题
        // 调度器需要可变对象来实时更新节点状态
        const mutableAst = fromJson<WorkflowGraphAst>(
          JSON.parse(JSON.stringify(toJson(workflow.workflowAst)))
        )

        // 将 abortSignal 附加到工作流上下文
        mutableAst.abortSignal = abortController.signal

        // executeAst 返回 Observable，使用 takeUntil 监听取消信号
        // finalize 确保无论如何结束（完成、错误、取消）都会重置状态
        const subscription = executeAst(mutableAst, inputs || {}, mutableAst)
          .pipe(
            takeUntil(cancelSubject$.current),
            finalize(() => {
              // 确保在所有情况下都重置运行状态和控制器引用
              abortControllerRef.current = null
              onSetRunning?.(false)
              // isWorkflowRunning 在各个完成路径中单独处理
            })
          )
          .subscribe({
            next: (event) => {
              // 处理所有节点事件（成功/失败/运行/输出/进度/增量），统一委托给事件应用模块
              applyWorkflowRunEvent(workflow, event)
            },
            error: async (error) => {
              console.error('[runWorkflow] 执行出错:', error)
              const errorInfo = extractErrorInfo(error)

              // 完成所有正在运行的节点记录
              nodeRecordIds.current.forEach((recordId, nodeId) => {
                recordNodeComplete(nodeId, recordId, 'fail', { message: errorInfo.message })
              })
              nodeRecordIds.current.clear()

              // 检查是否是取消导致的错误
              if (error?.name === 'AbortError' || errorInfo.message.includes('取消')) {
                onShowToast?.('info', '工作流已取消', '用户主动取消执行')
              } else {
                console.error('工作流执行异常:', error)
                onShowToast?.('error', '工作流执行异常', errorInfo.message)
              }

              cleanup()

              // 执行失败后保存状态
              try {
                if (getViewport) {
                  workflow.workflowAst!.viewport = getViewport()
                }
                const controller = root.get<WorkflowController>(WorkflowController)
                await controller.saveWorkflow(workflow.workflowAst!)
              } catch (saveError: any) {
                console.error('[runWorkflow] 执行失败后保存工作流失败:', saveError)
              }
            },
            complete: async () => {
              // 确保最终状态同步到 UI
              workflow.syncFromAst()

              // 统计执行结果
              const successCount = workflow.workflowAst!.nodes.filter(n => n.state === 'success').length
              const failCount = workflow.workflowAst!.nodes.filter(n => n.state === 'fail').length

              if (failCount === 0) {
                onShowToast?.('success', '工作流执行成功', `共执行 ${successCount} 个节点`)
              } else if (successCount > 0) {
                onShowToast?.('error', '工作流部分失败', `成功: ${successCount}, 失败: ${failCount}`)
              } else {
                onShowToast?.('error', '工作流执行失败', `所有节点均失败`)
              }

              cleanup()

              // 执行完成后保存状态
              try {
                if (getViewport) {
                  workflow.workflowAst!.viewport = getViewport()
                }
                const controller = root.get<WorkflowController>(WorkflowController)
                await controller.saveWorkflow(workflow.workflowAst!)
              } catch (error: any) {
                console.error('[runWorkflow] 执行完成后保存工作流失败:', error)
              }

              onComplete?.()
            }
          })

        // 返回取消函数，便于外部管理
        return () => {
          cancelSubject$.current.next()
          abortController.abort()
          abortControllerRef.current = null
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('[runWorkflow] 执行过程中发生异常:', error)
        cleanup()
        throw error
      }
    },
    [workflow, onShowToast, onSetRunning, getViewport, cancelSubject$, abortControllerRef, isWorkflowRunningRef, nodeRecordIds, recordNodeComplete]
  )

  /**
   * 取消工作流执行
   *
   * 优雅设计：
   * - 通过 Subject.next() 触发 takeUntil，让 Observable 流自动完成
   * - 符合响应式编程范式，比直接 unsubscribe 更优雅
   * - 同时触发 AbortSignal 用于取消异步操作
   */
  const cancelWorkflow = useCallback(() => {
    if (!abortControllerRef.current) {
      onShowToast?.('info', '没有正在运行的工作流', '当前没有需要取消的任务')
      return
    }

    // 触发取消信号：通过 Subject emit 值，takeUntil 会自动完成流
    cancelSubject$.current.next()

    // 触发 AbortSignal
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // 重置正在运行的节点状态（不可变方式），但保留输出字段
    if (workflow.workflowAst) {
      workflow.workflowAst.nodes = workflow.workflowAst.nodes.map(node => {
        if (node.state === 'running') {
          // 保留输出字段
          const outputFields: Record<string, any> = {}
          node.metadata?.outputs?.forEach((output: any) => {
            if (node[output.property] !== undefined) {
              outputFields[output.property] = node[output.property]
            }
          })

          return Object.assign(
            Object.create(Object.getPrototypeOf(node)),
            node,
            { state: 'pending', error: undefined, ...outputFields }
          )
        }
        return node
      })
      workflow.syncFromAst()
    }

    onSetRunning?.(false)
    onShowToast?.('info', '工作流已取消', '已停止执行')

    // 重置执行标志
    isWorkflowRunningRef.current = false
  }, [workflow, onSetRunning, onShowToast, cancelSubject$, abortControllerRef, isWorkflowRunningRef])

  return { runWorkflow, cancelWorkflow }
}
