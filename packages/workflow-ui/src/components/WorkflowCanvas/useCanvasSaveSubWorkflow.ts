import { useCallback } from 'react'
import type { WorkflowGraphAst } from '@sker/workflow'

/**
 * 包装 saveSubWorkflow，保存后刷新节点端口
 *
 * 通过 requestAnimationFrame 双帧延迟，确保在 React Flow 渲染完成后
 * 重新计算子工作流节点的端口位置。
 */
export function useCanvasSaveSubWorkflow(
  originalSaveSubWorkflow: (parentNodeId: string, updatedAst: WorkflowGraphAst) => string | undefined,
  updateNodeInternals: (nodeId: string) => void
) {
  return useCallback(
    (parentNodeId: string, updatedAst: WorkflowGraphAst) => {
      const result = originalSaveSubWorkflow(parentNodeId, updatedAst)

      // 如果保存成功（返回了 parentNodeId），刷新该节点的端口
      if (result) {
        // 使用 requestAnimationFrame 确保在下一帧渲染后刷新
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            updateNodeInternals(result)
          })
        })
      }

      return result
    },
    [originalSaveSubWorkflow, updateNodeInternals]
  )
}
