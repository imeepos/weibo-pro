import { useCallback } from 'react'
import { executeAst, fromJson, toJson, type WorkflowGraphAst } from '@sker/workflow'
import type { useWorkflow } from '../../hooks/useWorkflow'
import type { ToastType } from './Toast'
import { WorkflowController } from '@sker/sdk'
import { root } from '@sker/core'

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

      const ast = fromJson(targetNode)
      const ctx = workflow.workflowAst.ctx || {}

      // executeAst 返回 Observable，利用流式特性实时更新状态
      console.log(`run ast`, { ast, ctx })
      const subscription = executeAst(toJson(ast), ctx).subscribe({
        next: (updatedNode) => {
          console.log(`节点状态更新`, updatedNode)
          // 每次 next 事件实时更新节点状态
          const astNode = workflow.workflowAst?.nodes.find(n => n.id === nodeId)
          if (astNode) {
            Object.assign(astNode, updatedNode)
            workflow.syncFromAst()
          }

          // 当节点状态为 emitting 时,派发事件触发边动画
          if (updatedNode.state === 'emitting') {
            window.dispatchEvent(new CustomEvent('node-emitting', {
              detail: { nodeId: updatedNode.id }
            }))
          }

          // 根据最终状态显示提示
          if (updatedNode.state === 'success') {
            console.info(`节点执行成功`)
            onShowToast?.('success', '节点执行成功')
          } else if (updatedNode.state === 'fail') {
            const errorInfo = extractErrorInfo(updatedNode.error)
            console.error({errorInfo, updatedNode})
            onShowToast?.('error', '节点执行失败', errorInfo.message)
          }
        },
        error: (error) => {
          const errorInfo = extractErrorInfo(error)
          console.error(`节点执行异常`)
          onShowToast?.('error', '节点执行异常', errorInfo.message)
          onSetRunning?.(false)
        },
        complete: () => {
          console.log(`节点执行完成`)
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

      onSetRunning?.(true)

      const ctx = workflow.workflowAst.ctx || {}

      // executeAst 返回 Observable，利用流式特性实时更新状态
      const subscription = executeAst(workflow.workflowAst, ctx).subscribe({
        next: (updatedWorkflow) => {
          // 每次 next 事件实时更新工作流状态
          Object.assign(workflow.workflowAst!, updatedWorkflow)
          workflow.syncFromAst()

          // 遍历所有节点,派发 emitting 事件
          updatedWorkflow.nodes?.forEach((node) => {
            if (node.state === 'emitting') {
              window.dispatchEvent(new CustomEvent('node-emitting', {
                detail: { nodeId: node.id }
              }))
            }
          })
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

          onComplete?.()
          onSetRunning?.(false)
        }
      })

      // 返回取消订阅函数，便于外部管理
      return () => subscription.unsubscribe()
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
    runWorkflow,
    saveWorkflow,
    saveSubWorkflow,
  }
}
