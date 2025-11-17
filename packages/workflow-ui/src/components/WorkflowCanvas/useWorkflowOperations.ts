import { useCallback } from 'react'
import { executeAst, fromJson, type WorkflowGraphAst } from '@sker/workflow'
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
   * - 有本地 Handler 则本地执行（如微博登录 SSE）
   * - 无本地 Handler 则调用远程 API（如 Playwright 采集）
   * - 无需额外判断，代码即文档
   */
  const runNode = useCallback(
    async (nodeId: string) => {
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

      try {
        const ast = fromJson(targetNode)
        const ctx = workflow.workflowAst.ctx || {}

        // executeAst 会通过装饰器系统自动查找 @Handler 执行器
        console.log(`run ast`, { ast, ctx })
        const result = await executeAst(ast, ctx)
        console.log(`run ast success`, result)
        const astNode = workflow.workflowAst.nodes.find(n => n.id === nodeId)
        if (astNode) {
          Object.assign(astNode, result)
        }

        workflow.syncFromAst()

        if (result.state === 'success') {
          console.info(`节点执行成功`)
          onShowToast?.('success', '节点执行成功')
        } else if (result.state === 'fail') {
          const errorInfo = extractErrorInfo(result.error)
          console.error(`节点执行失败`)
          onShowToast?.('error', '节点执行失败', errorInfo.message)
        }
      } catch (error: any) {
        const errorInfo = extractErrorInfo(error)
        console.error(`节点执行失败`)
        onShowToast?.('error', '节点执行失败', errorInfo.message)
      } finally {
        onSetRunning?.(false)
      }
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
   */
  const runWorkflow = useCallback(
    async (onComplete?: () => void) => {
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

      try {
        let currentState = workflow.workflowAst
        const ctx = workflow.workflowAst.ctx || {}

        // 参考 execute 函数的实现，循环执行直到完成
        while (currentState.state === 'pending' || currentState.state === 'running') {
          currentState = await executeAst(currentState, ctx)

          // 每执行一步后更新状态
          Object.assign(workflow.workflowAst, currentState)
          workflow.syncFromAst()
        }

        // 统计执行结果
        const successCount = workflow.workflowAst.nodes.filter(n => n.state === 'success').length
        const failCount = workflow.workflowAst.nodes.filter(n => n.state === 'fail').length

        if (failCount === 0) {
          onShowToast?.('success', '工作流执行成功', `共执行 ${successCount} 个节点`)
        } else if (successCount > 0) {
          onShowToast?.('error', '工作流部分失败', `成功: ${successCount}, 失败: ${failCount}`)
        } else {
          onShowToast?.('error', '工作流执行失败', `所有节点均失败`)
        }

        onComplete?.()
      } catch (error: any) {
        const errorInfo = extractErrorInfo(error)
        onShowToast?.('error', '工作流执行异常', errorInfo.message)
      } finally {
        onSetRunning?.(false)
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
