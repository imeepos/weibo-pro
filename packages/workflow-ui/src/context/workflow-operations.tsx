import { createContext, useContext } from 'react'
import type { WorkflowGraphAst } from '@sker/workflow'

/**
 * 工作流操作上下文
 *
 * 优雅设计：
 * - 通过 Context 传递工作流操作函数，避免全局事件
 * - 类型安全，自动补全
 * - 解耦 Renderer 和 Hook 层
 */
export interface WorkflowOperations {
  /** 切换分组折叠状态 */
  toggleGroupCollapse: (groupId: string) => void
  /** 打开子工作流编辑器 */
  openSubWorkflow?: (nodeId: string, workflowAst: WorkflowGraphAst) => void
  /** 选中节点 */
  selectNode?: (nodeId: string) => void
}

export const WorkflowOperationsContext = createContext<WorkflowOperations | null>(null)

/**
 * 在 Renderer 中使用工作流操作
 *
 * @example
 * ```tsx
 * const ops = useWorkflowOperations()
 * <button onClick={() => ops.toggleGroupCollapse(ast.id)}>
 *   Toggle
 * </button>
 * ```
 */
export function useWorkflowOperations(): WorkflowOperations {
  const context = useContext(WorkflowOperationsContext)
  if (!context) {
    // 优雅降级：提供默认实现（控制台警告）
    return {
      toggleGroupCollapse: (groupId) => {
        console.warn('toggleGroupCollapse called outside WorkflowOperationsContext:', groupId)
      }
    }
  }
  return context
}
