import { useCallback } from 'react'
import { getNodeById, type WorkflowGraphAst } from '@sker/workflow'
import { root } from '@sker/core'
import { WorkflowController } from '@sker/sdk'
import { getExposedInputs, getExposedOutputs } from '../../../utils/workflow-ports'
import type { UseWorkflowReturn } from '../../../hooks/useWorkflow'
import type { WorkflowOperationsCallbacks } from './types'

/**
 * 工作流保存操作 Hook
 *
 * 职责：封装 saveWorkflow / saveSubWorkflow。
 * - saveWorkflow：保存顶层工作流（名称、viewport）
 * - saveSubWorkflow：将子工作流 AST 回写父节点，并动态重建 metadata 端口
 */
export function useSaveWorkflowOperations(
  workflow: UseWorkflowReturn,
  callbacks: WorkflowOperationsCallbacks
) {
  const { onShowToast, onSetSaving, getViewport } = callbacks

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
        workflow.workflowAst.name = name
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
   *
   * 优雅设计：
   * - 更新父节点中的子工作流数据
   * - 动态重新生成 metadata，反映最新的端口结构
   * - 通过 syncFromAst 强制重新生成所有节点，触发 React 更新
   * - 返回父节点 ID，通知调用者刷新节点端口
   */
  const saveSubWorkflow = useCallback(
    (parentNodeId: string, updatedAst: WorkflowGraphAst, onComplete?: () => void) => {
      if (!workflow.workflowAst) {
        onShowToast?.('error', '保存失败', '父工作流不存在')
        return
      }

      try {
        const parentNode = getNodeById(workflow.workflowAst.nodes, parentNodeId)

        if (parentNode && parentNode.type === 'WorkflowGraphAst') {
          // 更新子工作流数据
          parentNode.nodes = [...updatedAst.nodes]
          parentNode.edges = [...updatedAst.edges]
          parentNode.name = updatedAst.name
          parentNode.description = updatedAst.description
          parentNode.viewport = updatedAst.viewport ? { ...updatedAst.viewport } : undefined

          // 动态生成 metadata - 反映子工作流的实际端口结构
          // 存在即合理：WorkflowGraphAst 的端口由内部节点决定，保存时必须重新计算
          if (parentNode.metadata) {
            // 计算暴露的输入端口
            const exposedInputs = getExposedInputs(parentNode)
            parentNode.metadata.inputs = exposedInputs.map((input) => {
              // 查找原始节点的 metadata，保留所有字段
              const originNode = parentNode.nodes?.find((n: any) => n.id === input.nodeId)
              const originInputMeta = originNode?.metadata?.inputs.find(
                (m: any) => String(m.property) === input.property
              )

              return {
                property: `${input.nodeId}.${input.property}`,
                type: input.type as any,
                title: input.title || input.property,
                required: input.required,
                mode: originInputMeta?.mode,
                defaultValue: originInputMeta?.defaultValue
              }
            })

            // 计算暴露的输出端口
            const exposedOutputs = getExposedOutputs(parentNode)
            parentNode.metadata.outputs = exposedOutputs.map((output) => {
              // 查找原始节点的 metadata，保留所有字段
              const originNode = parentNode.nodes?.find((n: any) => n.id === output.nodeId)
              const originOutputMeta = originNode?.metadata?.outputs.find(
                (m: any) => String(m.property) === output.property
              )

              return {
                property: `${output.nodeId}.${output.property}`,
                type: output.type,
                title: output.title || output.property,
                isRouter: originOutputMeta?.isRouter,
                dynamic: originOutputMeta?.dynamic,
                condition: originOutputMeta?.condition
              }
            })
          }

          // 强制同步到 React Flow，完全重新生成节点数组
          // 这会创建新的 Flow 节点对象，触发 React 重新渲染
          workflow.syncFromAst()

          onShowToast?.('success', '子工作流已保存', '更改已同步到父工作流')
          onComplete?.()

          // 返回父节点 ID
          return parentNodeId
        } else {
          onShowToast?.('error', '保存失败', '无法找到对应的子工作流节点')
        }
      } catch (_error) {
        onShowToast?.('error', '保存失败', '无法更新子工作流')
      }
    },
    [workflow, onShowToast]
  )

  return { saveWorkflow, saveSubWorkflow }
}
