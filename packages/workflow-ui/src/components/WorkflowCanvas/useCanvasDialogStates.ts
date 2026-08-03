import { useCallback, useState } from 'react'
import type { WorkflowGraphAst, IEdge } from '@sker/workflow'

/**
 * 画布对话框状态子 Hook
 *
 * 集中管理所有对话框/面板的可见性与数据状态。
 */
export function useCanvasDialogStates() {
  // 分享对话框状态
  const [shareDialog, setShareDialog] = useState<{ visible: boolean; url: string }>({
    visible: false,
    url: '',
  })

  // 子工作流模态框状态
  const [subWorkflowModal, setSubWorkflowModal] = useState<{
    visible: boolean
    nodeId?: string
    workflowAst?: WorkflowGraphAst
  }>({ visible: false })

  // 设置面板状态
  const [settingPanel, setSettingPanel] = useState<{
    visible: boolean
    nodeId?: string
    nodeData?: any
  }>({ visible: false })

  // 左侧抽屉状态
  const [drawer, setDrawer] = useState<{ visible: boolean; nodeId?: string }>({
    visible: false,
  })

  // 边配置对话框状态
  const [edgeConfigDialog, setEdgeConfigDialog] = useState<{
    visible: boolean
    edge: IEdge | null
  }>({ visible: false, edge: null })

  // 工作流设置对话框状态
  const [workflowSettingsDialog, setWorkflowSettingsDialog] = useState<{
    visible: boolean
  }>({ visible: false })

  // 调度对话框状态
  const [scheduleDialog, setScheduleDialog] = useState<{
    visible: boolean
    workflowName?: string
  }>({ visible: false })

  // 调度列表面板状态
  const [schedulePanel, setSchedulePanel] = useState<{
    visible: boolean
    workflowName?: string
  }>({ visible: false })

  // 运行历史面板状态
  const [runHistoryPanel, setRunHistoryPanel] = useState<{
    visible: boolean
    workflowId?: string
  }>({ visible: false })

  // 运行配置对话框状态
  const [runConfigDialog, setRunConfigDialog] = useState<{
    visible: boolean
    defaultInputs?: Record<string, unknown>
  }>({ visible: false })

  // AI导出对话框状态
  const [aiExportDialog, setAiExportDialog] = useState<{
    visible: boolean
  }>({ visible: false })

  /**
   * 打开分享对话框
   */
  const openShareDialog = useCallback((url: string) => {
    setShareDialog({ visible: true, url })
  }, [])

  const closeShareDialog = useCallback(() => {
    setShareDialog({ visible: false, url: '' })
  }, [])

  /**
   * 打开子工作流模态框
   */
  const openSubWorkflowModal = useCallback((params: {
    nodeId?: string
    workflowAst?: WorkflowGraphAst
  }) => {
    setSubWorkflowModal({ visible: true, ...params })
  }, [])

  const closeSubWorkflowModal = useCallback(() => {
    setSubWorkflowModal({ visible: false })
  }, [])

  /**
   * 打开设置面板
   */
  const openSettingPanel = useCallback((params: { nodeId?: string; nodeData?: any }) => {
    setSettingPanel({ visible: true, ...params })
  }, [])

  const closeSettingPanel = useCallback(() => {
    setSettingPanel({ visible: false, nodeId: undefined, nodeData: undefined })
  }, [])

  /**
   * 打开左侧抽屉
   */
  const openDrawer = useCallback((nodeId?: string) => {
    setDrawer({ visible: true, nodeId })
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawer({ visible: false, nodeId: undefined })
  }, [])

  /**
   * 打开边配置对话框
   */
  const openEdgeConfigDialog = useCallback((edge: IEdge) => {
    setEdgeConfigDialog({ visible: true, edge })
  }, [])

  const closeEdgeConfigDialog = useCallback(() => {
    setEdgeConfigDialog({ visible: false, edge: null })
  }, [])

  /**
   * 打开工作流设置对话框
   */
  const openWorkflowSettingsDialog = useCallback(() => {
    setWorkflowSettingsDialog({ visible: true })
  }, [])

  const closeWorkflowSettingsDialog = useCallback(() => {
    setWorkflowSettingsDialog({ visible: false })
  }, [])

  /**
   * 打开调度对话框
   */
  const openScheduleDialog = useCallback((workflowName?: string) => {
    setScheduleDialog({ visible: true, workflowName })
  }, [])

  const closeScheduleDialog = useCallback(() => {
    setScheduleDialog({ visible: false, workflowName: undefined })
  }, [])

  /**
   * 打开调度列表面板
   */
  const openSchedulePanel = useCallback((workflowName?: string) => {
    setSchedulePanel({ visible: true, workflowName })
  }, [])

  const closeSchedulePanel = useCallback(() => {
    setSchedulePanel({ visible: false, workflowName: undefined })
  }, [])

  /**
   * 打开运行历史面板
   */
  const openRunHistoryPanel = useCallback((workflowId?: string) => {
    setRunHistoryPanel({ visible: true, workflowId })
  }, [])

  const closeRunHistoryPanel = useCallback(() => {
    setRunHistoryPanel({ visible: false, workflowId: undefined })
  }, [])

  /**
   * 打开运行配置对话框
   */
  const openRunConfigDialog = useCallback((defaultInputs?: Record<string, unknown>) => {
    setRunConfigDialog({ visible: true, defaultInputs })
  }, [])

  const closeRunConfigDialog = useCallback(() => {
    setRunConfigDialog({ visible: false })
  }, [])

  /**
   * 打开AI导出对话框
   */
  const openAiExportDialog = useCallback(() => {
    setAiExportDialog({ visible: true })
  }, [])

  const closeAiExportDialog = useCallback(() => {
    setAiExportDialog({ visible: false })
  }, [])

  return {
    shareDialog,
    openShareDialog,
    closeShareDialog,

    subWorkflowModal,
    openSubWorkflowModal,
    closeSubWorkflowModal,

    scheduleDialog,
    openScheduleDialog,
    closeScheduleDialog,

    schedulePanel,
    openSchedulePanel,
    closeSchedulePanel,

    runHistoryPanel,
    openRunHistoryPanel,
    closeRunHistoryPanel,

    settingPanel,
    openSettingPanel,
    closeSettingPanel,

    drawer,
    openDrawer,
    closeDrawer,

    edgeConfigDialog,
    openEdgeConfigDialog,
    closeEdgeConfigDialog,

    workflowSettingsDialog,
    openWorkflowSettingsDialog,
    closeWorkflowSettingsDialog,

    runConfigDialog,
    openRunConfigDialog,
    closeRunConfigDialog,

    aiExportDialog,
    openAiExportDialog,
    closeAiExportDialog,
  }
}
