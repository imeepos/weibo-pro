import { useCallback, useState } from 'react'
import type { WorkflowGraphAst, IEdge } from '@sker/workflow'
import type { ToastType } from './Toast'

/**
 * 画布状态管理 Hook
 *
 * 优雅设计：
 * - 集中管理所有 UI 状态，避免在组件中分散管理
 * - 提供清晰的状态更新接口
 * - 保持状态管理的单一职责
 */
export function useCanvasState() {
  // 执行状态
  const [isRunning, setIsRunning] = useState(false)

  // 保存状态
  const [isSaving, setIsSaving] = useState(false)

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

  // Toast 提示状态
  const [toast, setToast] = useState<{
    visible: boolean
    type: ToastType
    title: string
    message?: string
  }>({ visible: false, type: 'info', title: '' })

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
    workflowId?: number
  }>({ visible: false })

  // 调度列表面板状态
  const [schedulePanel, setSchedulePanel] = useState<{
    visible: boolean
    workflowId?: number
  }>({ visible: false })

  /**
   * 显示 Toast 提示
   */
  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    setToast({ visible: true, type, title, message })
  }, [])

  /**
   * 隐藏 Toast 提示
   */
  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }))
  }, [])

  /**
   * 打开分享对话框
   */
  const openShareDialog = useCallback((url: string) => {
    setShareDialog({ visible: true, url })
  }, [])

  /**
   * 关闭分享对话框
   */
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

  /**
   * 关闭子工作流模态框
   */
  const closeSubWorkflowModal = useCallback(() => {
    setSubWorkflowModal({ visible: false })
  }, [])

  /**
   * 打开设置面板
   */
  const openSettingPanel = useCallback((params: { nodeId?: string; nodeData?: any }) => {
    setSettingPanel({ visible: true, ...params })
  }, [])

  /**
   * 关闭设置面板
   */
  const closeSettingPanel = useCallback(() => {
    setSettingPanel({ visible: false, nodeId: undefined, nodeData: undefined })
  }, [])

  /**
   * 打开左侧抽屉
   */
  const openDrawer = useCallback((nodeId?: string) => {
    setDrawer({ visible: true, nodeId })
  }, [])

  /**
   * 关闭左侧抽屉
   */
  const closeDrawer = useCallback(() => {
    setDrawer({ visible: false, nodeId: undefined })
  }, [])

  /**
   * 打开边配置对话框
   */
  const openEdgeConfigDialog = useCallback((edge: IEdge) => {
    setEdgeConfigDialog({ visible: true, edge })
  }, [])

  /**
   * 关闭边配置对话框
   */
  const closeEdgeConfigDialog = useCallback(() => {
    setEdgeConfigDialog({ visible: false, edge: null })
  }, [])

  /**
   * 打开工作流设置对话框
   */
  const openWorkflowSettingsDialog = useCallback(() => {
    setWorkflowSettingsDialog({ visible: true })
  }, [])

  /**
   * 关闭工作流设置对话框
   */
  const closeWorkflowSettingsDialog = useCallback(() => {
    setWorkflowSettingsDialog({ visible: false })
  }, [])

  /**
   * 打开调度对话框
   */
  const openScheduleDialog = useCallback((workflowId?: number) => {
    setScheduleDialog({ visible: true, workflowId })
  }, [])

  /**
   * 关闭调度对话框
   */
  const closeScheduleDialog = useCallback(() => {
    setScheduleDialog({ visible: false, workflowId: undefined })
  }, [])

  /**
   * 打开调度列表面板
   */
  const openSchedulePanel = useCallback((workflowId?: number) => {
    setSchedulePanel({ visible: true, workflowId })
  }, [])

  /**
   * 关闭调度列表面板
   */
  const closeSchedulePanel = useCallback(() => {
    setSchedulePanel({ visible: false, workflowId: undefined })
  }, [])

  return {
    // 执行状态
    isRunning,
    setIsRunning,

    // 保存状态
    isSaving,
    setIsSaving,

    // 分享对话框
    shareDialog,
    openShareDialog,
    closeShareDialog,

    // 子工作流模态框
    subWorkflowModal,
    openSubWorkflowModal,
    closeSubWorkflowModal,

    // 调度相关状态
    scheduleDialog,
    openScheduleDialog,
    closeScheduleDialog,

    schedulePanel,
    openSchedulePanel,
    closeSchedulePanel,

    // Toast 提示
    toast,
    showToast,
    hideToast,

    // 设置面板
    settingPanel,
    openSettingPanel,
    closeSettingPanel,

    // 左侧抽屉
    drawer,
    openDrawer,
    closeDrawer,

    // 边配置对话框
    edgeConfigDialog,
    openEdgeConfigDialog,
    closeEdgeConfigDialog,

    // 工作流设置对话框
    workflowSettingsDialog,
    openWorkflowSettingsDialog,
    closeWorkflowSettingsDialog,
  }
}
