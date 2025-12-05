import { useEffect, useState } from 'react'
import { useWorkflowStore } from '../store/workflow.store'
import { historyManager } from '../store/history.store'

/**
 * 画布撤销/重做 Hook
 *
 * 使用示例：
 * ```tsx
 * const { canUndo, canRedo, undo, redo } = useWorkflowHistory()
 *
 * <Button disabled={!canUndo} onClick={undo}>撤销</Button>
 * <Button disabled={!canRedo} onClick={redo}>重做</Button>
 * ```
 */
export function useWorkflowHistory() {
  const { undo, redo } = useWorkflowStore()
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    const undoSub = historyManager.canUndo$.subscribe(setCanUndo)
    const redoSub = historyManager.canRedo$.subscribe(setCanRedo)

    return () => {
      undoSub.unsubscribe()
      redoSub.unsubscribe()
    }
  }, [])

  return {
    canUndo,
    canRedo,
    undo,
    redo,
  }
}
