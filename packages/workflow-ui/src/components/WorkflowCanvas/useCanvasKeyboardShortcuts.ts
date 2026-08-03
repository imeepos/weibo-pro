import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

export interface UseCanvasKeyboardShortcutsParams {
  customOnSave?: () => void
  workflowName?: string
  saveWorkflow: (name: string) => Promise<unknown>
  cancelWorkflow: () => void
  undo: () => void
  redo: () => void
  copyNodes: () => void
  cutNodes: () => void
  pasteNodes: (position?: { x: number; y: number }) => void
  deleteSelection: () => void
  handleSelectAll: () => void
  createGroup: () => void
  ungroupNodes: () => void
  collapseNodes: () => void
  expandNodes: () => void
  autoLayout: () => void
  screenToFlowPosition: (screenPosition: { x: number; y: number }) => { x: number; y: number }
  lastMousePosition: { x: number; y: number }
}

/**
 * 画布键盘快捷键 Hook
 *
 * 统一配置 useKeyboardShortcuts，将快捷键映射到画布业务操作。
 */
export function useCanvasKeyboardShortcuts({
  customOnSave,
  workflowName,
  saveWorkflow,
  cancelWorkflow,
  undo,
  redo,
  copyNodes,
  cutNodes,
  pasteNodes,
  deleteSelection,
  handleSelectAll,
  createGroup,
  ungroupNodes,
  collapseNodes,
  expandNodes,
  autoLayout,
  screenToFlowPosition,
  lastMousePosition,
}: UseCanvasKeyboardShortcutsParams) {
  useKeyboardShortcuts({
    enabled: true,
    onCopy: copyNodes,
    onCut: cutNodes,
    onPaste: () => {
      // 将屏幕坐标转换为 Flow 坐标
      const flowPosition = screenToFlowPosition(lastMousePosition)
      pasteNodes(flowPosition)
    },
    onDelete: deleteSelection,
    onSelectAll: handleSelectAll,
    onSave: customOnSave || (() => saveWorkflow(workflowName || 'Untitled')),
    onCancel: cancelWorkflow,
    onToggleCollapse: () => { }, // 通过节点操作钩子处理
    onUndo: undo,
    onRedo: redo,
    onCreateGroup: createGroup,
    onUngroupNodes: ungroupNodes,
    onCollapseNodes: collapseNodes,
    onExpandNodes: expandNodes,
    onAutoLayout: autoLayout,
  })
}
