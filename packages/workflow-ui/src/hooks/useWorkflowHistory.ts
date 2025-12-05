import type { UseWorkflowReturn } from './useWorkflow'

/**
 * 画布撤销/重做 Hook
 *
 * 使用示例：
 * ```tsx
 * const workflow = useWorkflow(...)
 * const { canUndo, canRedo, undo, redo } = useWorkflowHistory(workflow)
 *
 * <Button disabled={!canUndo} onClick={undo}>撤销</Button>
 * <Button disabled={!canRedo} onClick={redo}>重做</Button>
 * ```
 *
 * 优雅设计：
 * - 不再依赖独立的 useWorkflowStore
 * - 直接从 useWorkflow 返回值获取历史记录功能
 * - 保持接口不变，实现内部重构
 */
export function useWorkflowHistory(workflow: UseWorkflowReturn) {
  return {
    canUndo: workflow.canUndo,
    canRedo: workflow.canRedo,
    undo: workflow.undo,
    redo: workflow.redo,
  }
}
