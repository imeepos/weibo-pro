import { useCallback } from 'react'
import { root } from '@sker/core'
import { WorkflowController } from '@sker/sdk'
import type { WorkflowGraphAst } from '@sker/workflow'
import type { useWorkflow } from '../../hooks/useWorkflow'
import type { ToastType } from './Toast'

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
   */
  const runNode = useCallback(
    async (nodeId: string) => {
      if (!workflow.workflowAst) {
        onShowToast?.('error', '工作流 AST 不存在')
        return
      }

      try {
        const controller = root.get<WorkflowController>(WorkflowController)
        const result = await controller.executeNode(workflow.workflowAst)

        Object.assign(workflow.workflowAst, result)
        workflow.syncFromAst()

        if (result.state === 'success') {
          onShowToast?.('success', '节点执行成功')
        } else if (result.state === 'fail') {
          const errorMessage = typeof result.error === 'string' ? result.error : result.error?.message || '未知错误'
          onShowToast?.('error', '节点执行失败', errorMessage)
        }
      } catch (error: any) {
        onShowToast?.('error', '节点执行失败', error.message || '未知错误')
      }
    },
    [workflow, onShowToast]
  )

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
        const controller = root.get<WorkflowController>(WorkflowController)

        let successCount = 0
        let failCount = 0
        let stepCount = 0
        const maxSteps = nodes.length * 2

        while (stepCount < maxSteps) {
          stepCount++

          const result = await controller.executeNode(workflow.workflowAst)

          Object.assign(workflow.workflowAst, result)
          workflow.syncFromAst()

          if (result.state === 'success') {
            successCount++
          } else if (result.state === 'fail') {
            failCount++
            if (failCount === 1 && result.error) {
              onShowToast?.('error', '工作流执行失败', result.error.message || '未知错误')
            }
          }

          const allCompleted = workflow.workflowAst.nodes.every(
            (node) => node.state === 'success' || node.state === 'fail'
          )

          if (
            allCompleted ||
            workflow.workflowAst.state === 'success' ||
            workflow.workflowAst.state === 'fail'
          ) {
            break
          }
        }

        if (failCount === 0) {
          onShowToast?.('success', '工作流执行成功', `共执行 ${successCount} 个节点`)
        } else if (successCount > 0) {
          onShowToast?.('error', '工作流部分失败', `成功: ${successCount}, 失败: ${failCount}`)
        }

        onComplete?.()
      } catch (error: any) {
        onShowToast?.('error', '工作流执行异常', error.message || '未知错误')
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
        const result = await controller.saveWorkflow(workflow.workflowAst)

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
