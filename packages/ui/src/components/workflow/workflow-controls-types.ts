export const controlButtonClassName = 'h-9 w-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground'

export interface WorkflowControlsProps {
  // 工作流操作
  onRun?: () => void
  onDebugRun?: () => void
  onCancel?: () => void
  onSave?: () => void
  onExport?: () => void
  onAiExport?: () => void
  onImport?: () => void
  onSettings?: () => void
  onSchedule?: () => void
  onScheduleList?: () => void
  onRunHistory?: () => void
  onEventStoreToggle?: (enabled: boolean) => void

  // 视图控制
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void

  // 节点操作
  onCollapseNodes?: () => void
  onExpandNodes?: () => void
  onAutoLayout?: () => void

  // 历史操作
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean

  // 状态
  isRunning?: boolean
  isSaving?: boolean
  eventStoreEnabled?: boolean

  // 样式
  className?: string
}
