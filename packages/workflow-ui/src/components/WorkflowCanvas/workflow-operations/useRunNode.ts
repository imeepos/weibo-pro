import { useCallback } from 'react'
import { executeAstWithWorkflowGraph, executeNodeIsolated, fromJson, toJson, type WorkflowGraphAst, getNodeById } from '@sker/workflow'
import { root } from '@sker/core'
import { WorkflowController } from '@sker/sdk'
import { finalize } from 'rxjs'
import { useExecutionStore } from '../../../store/execution.store'
import type { UseWorkflowReturn } from '../../../hooks/useWorkflow'
import type { WorkflowOperationsCallbacks, WorkflowOperationRefs } from './types'
import { extractErrorInfo, mergeNodeState, trackNodeExecution } from './utils'

/**
 * 单节点执行操作 Hook
 *
 * 职责：封装 runNode / runNodeIsolated 两个单节点执行入口。
 * - 执行前自动保存工作流状态
 * - 深拷贝 AST 避免 Zustand + Immer 冻结对象导致的只读属性问题
 * - 通过 Observable 流式更新节点状态，finalize 确保状态重置
 */
export function useRunNodeOperations(
  workflow: UseWorkflowReturn,
  callbacks: WorkflowOperationsCallbacks,
  refs: WorkflowOperationRefs
) {
  const { onShowToast, onSetRunning, getViewport } = callbacks
  const { nodeRecordIds } = refs
  const { recordNodeStart, recordNodeComplete } = useExecutionStore.getState()

  /**
   * 运行单个节点
   *
   * 优雅设计：
   * - 直接调用 executeAstWithWorkflowGraph，装饰器系统自动查找 Handler
   * - 利用 Observable 流式特性，实时更新节点状态
   * - 每次 next 事件触发状态同步，提供流畅执行体验
   * - 执行前后自动保存状态，确保数据持久化
   */
  const runNode = useCallback(
    async (nodeId: string) => {
      if (!workflow.workflowAst) {
        console.error(`工作流 AST 不存在`)
        onShowToast?.('error', '工作流 AST 不存在')
        return
      }

      const targetNode = getNodeById(workflow.workflowAst.nodes, nodeId)
      if (!targetNode) {
        console.error(`节点不存在`)
        onShowToast?.('error', '节点不存在', `节点ID: ${nodeId}`)
        return
      }

      // 执行前保存状态
      try {
        if (getViewport) {
          workflow.workflowAst.viewport = getViewport()
        }
        const controller = root.get<WorkflowController>(WorkflowController)
        await controller.saveWorkflow(workflow.workflowAst)
      } catch (error: any) {
        console.error('执行前保存工作流失败:', error)
      }

      onSetRunning?.(true)

      // ✨ 深拷贝 AST：避免 Zustand + Immer 冻结对象导致的只读属性问题
      // 调度器需要可变对象来实时更新节点状态
      const mutableAst = fromJson<WorkflowGraphAst>(
        JSON.parse(JSON.stringify(toJson(workflow.workflowAst)))
      )

      // executeAstWithWorkflowGraph 返回 Observable，利用流式特性实时更新状态
      // finalize 确保无论如何结束都会重置状态
      const subscription = executeAstWithWorkflowGraph(targetNode, {}, mutableAst)
        .pipe(
          finalize(() => {
            // 确保在所有情况下都重置运行状态
            onSetRunning?.(false)
          })
        )
        .subscribe({
          next: (event) => {
            if (event.type !== 'node_success' && event.type !== 'node_fail') return

            // 从 mutableAst 中获取更新后的节点
            const updatedNode = getNodeById(mutableAst.nodes, event.id)
            if (!updatedNode) return

            workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
              if (originalNode.id !== updatedNode.id) return originalNode

              // 记录节点执行历史
              trackNodeExecution(originalNode, updatedNode, nodeRecordIds, recordNodeStart, recordNodeComplete)

              return mergeNodeState(originalNode, updatedNode)
            })
            workflow.syncFromAst()
          },
          error: async (error) => {
            const errorInfo = extractErrorInfo(error)
            nodeRecordIds.current.forEach((recordId, nId) => {
              recordNodeComplete(nId, recordId, 'fail', { message: errorInfo.message })
            })
            nodeRecordIds.current.clear()
            console.error(`工作流执行异常`)
            onShowToast?.('error', '工作流执行异常', errorInfo.message)

            try {
              if (getViewport) {
                workflow.workflowAst!.viewport = getViewport()
              }
              const controller = root.get<WorkflowController>(WorkflowController)
              await controller.saveWorkflow(workflow.workflowAst!)
            } catch (saveError: any) {
              console.error('执行失败后保存工作流失败:', saveError)
            }
          },
          complete: async () => {
            workflow.syncFromAst()

            const successCount = workflow.workflowAst!.nodes.filter(n => n.state === 'success').length
            const failCount = workflow.workflowAst!.nodes.filter(n => n.state === 'fail').length

            if (failCount === 0) {
              onShowToast?.('success', '工作流执行成功', `共执行 ${successCount} 个节点`)
            } else if (successCount > 0) {
              onShowToast?.('error', '工作流部分失败', `成功: ${successCount}, 失败: ${failCount}`)
            } else {
              onShowToast?.('error', '工作流执行失败', `所有节点均失败`)
            }

            try {
              if (getViewport) {
                workflow.workflowAst!.viewport = getViewport()
              }
              const controller = root.get<WorkflowController>(WorkflowController)
              await controller.saveWorkflow(workflow.workflowAst!)
            } catch (error: any) {
              console.error('执行完成后保存工作流失败:', error)
            }
          }
        })

      return () => subscription.unsubscribe()
    },
    [workflow, onShowToast, onSetRunning, getViewport, nodeRecordIds, recordNodeStart, recordNodeComplete]
  )

  const runNodeIsolated = useCallback(
    async (nodeId: string) => {
      if (!workflow.workflowAst) {
        console.error(`工作流 AST 不存在`)
        onShowToast?.('error', '工作流 AST 不存在')
        return
      }

      const targetNode = getNodeById(workflow.workflowAst.nodes, nodeId)
      if (!targetNode) {
        console.error(`节点不存在`)
        onShowToast?.('error', '节点不存在', `节点ID: ${nodeId}`)
        return
      }

      try {
        if (getViewport) {
          workflow.workflowAst.viewport = getViewport()
        }
        const controller = root.get<WorkflowController>(WorkflowController)
        await controller.saveWorkflow(workflow.workflowAst)
      } catch (error: any) {
        console.error('执行前保存工作流失败:', error)
      }

      onSetRunning?.(true)

      const mutableAst = fromJson<WorkflowGraphAst>(
        JSON.parse(JSON.stringify(toJson(workflow.workflowAst)))
      )

      const subscription = executeNodeIsolated(targetNode, mutableAst)
        .pipe(
          finalize(() => {
            onSetRunning?.(false)
          })
        )
        .subscribe({
          next: (event) => {
            if (event.type !== 'node_success' && event.type !== 'node_fail') return

            // 从 mutableAst 中获取更新后的状态
            workflow.workflowAst!.state = mutableAst.state
            workflow.workflowAst!.error = mutableAst.error

            // 从 mutableAst 中同步所有节点状态
            workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
              const updatedNode = getNodeById(mutableAst.nodes, originalNode.id)
              if (!updatedNode) return originalNode

              trackNodeExecution(originalNode, updatedNode, nodeRecordIds, recordNodeStart, recordNodeComplete)
              return mergeNodeState(originalNode, updatedNode)
            })
            workflow.syncFromAst()
          },
          error: async (error) => {
            const errorInfo = extractErrorInfo(error)
            nodeRecordIds.current.forEach((recordId, nId) => {
              recordNodeComplete(nId, recordId, 'fail', { message: errorInfo.message })
            })
            nodeRecordIds.current.clear()
            console.error('节点执行异常')
            onShowToast?.('error', '节点执行异常', errorInfo.message)

            try {
              if (getViewport) {
                workflow.workflowAst!.viewport = getViewport()
              }
              const controller = root.get<WorkflowController>(WorkflowController)
              await controller.saveWorkflow(workflow.workflowAst!)
            } catch (saveError: any) {
              console.error('执行失败后保存工作流失败:', saveError)
            }
          },
          complete: async () => {
            workflow.syncFromAst()

            const nodeState = getNodeById(workflow.workflowAst!.nodes, nodeId)?.state
            if (nodeState === 'success') {
              onShowToast?.('success', '节点执行成功', '该节点已完成执行')
            } else if (nodeState === 'fail') {
              onShowToast?.('error', '节点执行失败', '请检查节点配置和输入数据')
            }

            try {
              if (getViewport) {
                workflow.workflowAst!.viewport = getViewport()
              }
              const controller = root.get<WorkflowController>(WorkflowController)
              await controller.saveWorkflow(workflow.workflowAst!)
            } catch (error: any) {
              console.error('执行完成后保存工作流失败:', error)
            }
          }
        })

      return () => subscription.unsubscribe()
    },
    [workflow, onShowToast, onSetRunning, getViewport, nodeRecordIds, recordNodeStart, recordNodeComplete]
  )

  return { runNode, runNodeIsolated }
}
