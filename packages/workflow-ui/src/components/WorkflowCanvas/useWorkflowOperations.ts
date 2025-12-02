import { useCallback, useRef } from 'react'
import { executeAstWithWorkflowGraph, executeNodeIsolated, executeAst, fromJson, toJson, type WorkflowGraphAst } from '@sker/workflow'
import type { useWorkflow } from '../../hooks/useWorkflow'
import type { ToastType } from './useCanvasState'
import { WorkflowController } from '@sker/sdk'
import { root } from '@sker/core'
import { Subscription } from 'rxjs'

/**
 * 工作流操作 Hook
 *
 * 优雅设计：
 * - 集中管理工作流的执行、保存等核心操作
 * - 提供清晰的业务接口
 * - 错误处理和状态管理分离
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
  const { onShowToast, onSetRunning, onSetSaving, getViewport } = callbacks || {}

  // 保存当前运行的订阅和取消控制器
  const runningSubscriptionRef = useRef<Subscription | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * 运行单个节点
   *
   * 优雅设计：
   * - 直接调用 executeAst，装饰器系统自动查找 Handler
   * - 利用 Observable 流式特性，实时更新节点状态
   * - 每次 next 事件触发状态同步，提供流畅执行体验
   * - 无需额外判断，代码即文档
   */
  const runNode = useCallback(
    (nodeId: string) => {
      console.log(`run node ${nodeId}`);
      if (!workflow.workflowAst) {
        console.error(`工作流 AST 不存在`)
        onShowToast?.('error', '工作流 AST 不存在')
        return
      }

      const targetNode = workflow.workflowAst.nodes.find(n => n.id === nodeId)
      if (!targetNode) {
        console.error(`节点不存在`)
        onShowToast?.('error', '节点不存在', `节点ID: ${nodeId}`)
        return
      }

      onSetRunning?.(true)

      // executeAst 返回 Observable，利用流式特性实时更新状态
      const subscription = executeAstWithWorkflowGraph(targetNode.id, workflow.workflowAst).subscribe({
        next: (updatedWorkflow) => {
          // 每次 next 事件实时更新工作流状态
          Object.assign(workflow.workflowAst!, updatedWorkflow)
          workflow.syncFromAst()
        },
        error: (error) => {
          const errorInfo = extractErrorInfo(error)
          console.error(`工作流执行异常`)
          onShowToast?.('error', '工作流执行异常', errorInfo.message)
          onSetRunning?.(false)
        },
        complete: () => {
          console.log(`工作流执行完成`)
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
          onSetRunning?.(false)
        }
      })

      // 返回取消订阅函数，便于外部管理
      return () => subscription.unsubscribe()
    },
    [workflow, onShowToast, onSetRunning]
  )

  /**
   * 运行单个节点（不影响下游）
   *
   * 优雅设计：
   * - 调用 executeNodeIsolated，只执行选中的节点
   * - 使用上游节点的历史输出作为输入
   * - 不触发下游节点重新执行
   * - 适合测试和调试场景
   */
  const runNodeIsolated = useCallback(
    (nodeId: string) => {
      console.log(`run node isolated ${nodeId}`);
      if (!workflow.workflowAst) {
        console.error(`工作流 AST 不存在`)
        onShowToast?.('error', '工作流 AST 不存在')
        return
      }

      const targetNode = workflow.workflowAst.nodes.find(n => n.id === nodeId)
      if (!targetNode) {
        console.error(`节点不存在`)
        onShowToast?.('error', '节点不存在', `节点ID: ${nodeId}`)
        return
      }

      onSetRunning?.(true)

      // executeNodeIsolated 返回 Observable，只执行单个节点
      const subscription = executeNodeIsolated(targetNode.id, workflow.workflowAst).subscribe({
        next: (updatedWorkflow) => {
          // 每次 next 事件实时更新工作流状态
          Object.assign(workflow.workflowAst!, updatedWorkflow)
          workflow.syncFromAst()
        },
        error: (error) => {
          const errorInfo = extractErrorInfo(error)
          console.error(`节点执行异常`)
          onShowToast?.('error', '节点执行异常', errorInfo.message)
          onSetRunning?.(false)
        },
        complete: () => {
          console.log(`节点执行完成`)
          // 只统计目标节点的执行结果
          const nodeState = workflow.workflowAst!.nodes.find(n => n.id === nodeId)?.state

          if (nodeState === 'success') {
            onShowToast?.('success', '节点执行成功', '该节点已完成执行')
          } else if (nodeState === 'fail') {
            onShowToast?.('error', '节点执行失败', '请检查节点配置和输入数据')
          }
          onSetRunning?.(false)
        }
      })

      // 返回取消订阅函数，便于外部管理
      return () => subscription.unsubscribe()
    },
    [workflow, onShowToast, onSetRunning]
  )

  /**
   * 提取错误信息的辅助函数
   */
  function extractErrorInfo(error: unknown): { message: string; type?: string } {
    if (!error) return { message: '未知错误' }

    if (typeof error === 'object' && 'message' in error) {
      const err = error as any
      const deepError = err.cause ? extractDeepestError(err.cause) : err
      const rawMessage = deepError?.message || err.message || '执行失败'

      // 确保 message 始终是字符串
      let message = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage)

      // Special handling for login expired errors
      if (message.includes('登录') || message.includes('LOGIN')) {
        return { message: '登录态已过期，需要更换账号', type: 'LOGIN_EXPIRED' }
      }

      return { message, type: err.type }
    }

    if (typeof error === 'string') {
      return { message: error }
    }

    return { message: String(error) }
  }

  function extractDeepestError(error: any): any {
    if (!error) return null
    if (error.cause) {
      return extractDeepestError(error.cause)
    }
    return error
  }

  /**
   * 运行整个工作流
   *
   * 优雅设计：
   * - 利用 Observable 流式特性，实时更新工作流状态
   * - 每次 next 事件触发状态同步，提供流畅执行体验
   * - 自动统计执行结果，提供清晰反馈
   * - 自动取消上一次运行，避免重复执行
   */
  const runWorkflow = useCallback(
    (onComplete?: () => void) => {
      if (!workflow.workflowAst) {
        onShowToast?.('error', '工作流不存在', '无法执行空工作流')
        return
      }

      const nodes = workflow.nodes
      if (nodes.length === 0) {
        onShowToast?.('info', '没有节点可执行', '请先添加节点到画布')
        return
      }

      // 如果有正在运行的工作流，先取消
      if (runningSubscriptionRef.current) {
        console.log('检测到上一次工作流正在运行，自动取消')
        runningSubscriptionRef.current.unsubscribe()
        runningSubscriptionRef.current = null

        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
          abortControllerRef.current = null
        }

        onShowToast?.('info', '已取消上一次运行', '开始新的工作流执行')

        // 重置正在运行的节点状态
        workflow.workflowAst.nodes.forEach(node => {
          if (node.state === 'running') {
            node.state = 'pending'
            node.error = undefined
          }
        })
        workflow.syncFromAst()
      }

      // 创建新的 AbortController
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // 将 abortSignal 附加到工作流上下文
      workflow.workflowAst.abortSignal = abortController.signal

      onSetRunning?.(true)

      // executeAst 返回 Observable，利用流式特性实时更新状态
      const subscription = executeAst(workflow.workflowAst, workflow.workflowAst).subscribe({
        next: (updatedWorkflow) => {
          // 每次 next 事件实时更新工作流状态
          Object.assign(workflow.workflowAst!, updatedWorkflow)
          workflow.syncFromAst()
        },
        error: (error) => {
          runningSubscriptionRef.current = null
          abortControllerRef.current = null

          const errorInfo = extractErrorInfo(error)
          console.error(`工作流执行异常`)

          // 检查是否是取消导致的错误
          if (error?.name === 'AbortError' || errorInfo.message.includes('取消')) {
            onShowToast?.('info', '工作流已取消', '用户主动取消执行')
          } else {
            onShowToast?.('error', '工作流执行异常', errorInfo.message)
          }
          onSetRunning?.(false)
        },
        complete: () => {
          console.log(`工作流执行完成`)
          runningSubscriptionRef.current = null
          abortControllerRef.current = null

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

          onComplete?.()
          onSetRunning?.(false)
        }
      })

      // 保存订阅引用
      runningSubscriptionRef.current = subscription

      // 返回取消函数，便于外部管理
      return () => {
        subscription.unsubscribe()
        abortController.abort()
        runningSubscriptionRef.current = null
        abortControllerRef.current = null
      }
    },
    [workflow, onShowToast, onSetRunning]
  )

  /**
   * 保存工作流
   */
  const saveWorkflow = useCallback(
    async (name: string, onComplete?: () => void) => {
      if (!workflow.workflowAst) {
        onShowToast?.('error', '保存失败', '工作流不存在')
        return
      }

      onSetSaving?.(true)

      try {
        if (getViewport) {
          workflow.workflowAst.viewport = getViewport()
        }

        const controller = root.get<WorkflowController>(WorkflowController)
        workflow.workflowAst.name = name;
        await controller.saveWorkflow(workflow.workflowAst)

        onShowToast?.('success', '保存成功', '工作流已保存')
        onComplete?.()
      } catch (error: any) {
        onShowToast?.('error', '保存失败', error.message || '未知错误')
      } finally {
        onSetSaving?.(false)
      }
    },
    [workflow, onShowToast, onSetSaving, getViewport]
  )

  /**
   * 取消工作流执行
   *
   * 优雅设计：
   * - 取消 Observable 订阅
   * - 触发 AbortSignal
   * - 重置正在运行的节点状态
   * - 清理引用
   */
  const cancelWorkflow = useCallback(() => {
    if (!runningSubscriptionRef.current && !abortControllerRef.current) {
      onShowToast?.('info', '没有正在运行的工作流', '当前没有需要取消的任务')
      return
    }

    console.log('手动取消工作流执行')

    // 取消订阅
    if (runningSubscriptionRef.current) {
      runningSubscriptionRef.current.unsubscribe()
      runningSubscriptionRef.current = null
    }

    // 触发 AbortSignal
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // 重置正在运行的节点状态
    if (workflow.workflowAst) {
      workflow.workflowAst.nodes.forEach(node => {
        if (node.state === 'running') {
          node.state = 'pending'
          node.error = undefined
        }
      })
      workflow.syncFromAst()
    }

    onSetRunning?.(false)
    onShowToast?.('info', '工作流已取消', '已停止执行')
  }, [workflow, onSetRunning, onShowToast])

  /**
   * 保存子工作流
   */
  const saveSubWorkflow = useCallback(
    (parentNodeId: string, updatedAst: WorkflowGraphAst, onComplete?: () => void) => {
      if (!workflow.workflowAst) {
        onShowToast?.('error', '保存失败', '父工作流不存在')
        return
      }

      try {
        const parentNode = workflow.workflowAst.nodes.find((node) => node.id === parentNodeId)

        if (parentNode && parentNode.type === 'WorkflowGraphAst') {
          Object.assign(parentNode, updatedAst)
          workflow.syncFromAst()

          onShowToast?.('success', '子工作流已保存', '更改已同步到父工作流')
          onComplete?.()
        } else {
          onShowToast?.('error', '保存失败', '无法找到对应的子工作流节点')
        }
      } catch (error) {
        onShowToast?.('error', '保存失败', '无法更新子工作流')
      }
    },
    [workflow, onShowToast]
  )

  return {
    runNode,
    runNodeIsolated,
    runWorkflow,
    cancelWorkflow,
    saveWorkflow,
    saveSubWorkflow,
  }
}
