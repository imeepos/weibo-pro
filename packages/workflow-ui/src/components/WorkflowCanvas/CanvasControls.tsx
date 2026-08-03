'use client'

import React from 'react'
import { WorkflowControls, WorkflowMenubar } from '@sker/ui/components/workflow'
import type { ToastType } from './useCanvasState'

export interface CanvasControlsProps {
  showControls: boolean
  useMenubar: boolean
  /** 当前工作流名称（未保存时为 undefined） */
  workflowName?: string
  /** 当前工作流 ID（未保存时为 undefined） */
  workflowId?: string
  onRun: () => void
  onDebugRun: () => void
  onCancel: () => void
  onSave: () => void
  onExport: () => void
  onAiExport: () => void
  onImport: () => void
  onSettings: () => void
  openScheduleDialog: (workflowName?: string) => void
  openSchedulePanel: (workflowName?: string) => void
  openRunHistoryPanel: (workflowId?: string) => void
  showToast: (type: ToastType, title: string, message?: string) => void
  onEventStoreToggle: (enabled: boolean) => void
  eventStoreEnabled: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onCollapseNodes: () => void
  onExpandNodes: () => void
  onAutoLayout: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  isRunning: boolean
  isSaving: boolean
}

/**
 * 画布工具栏组件（纯展示）
 *
 * 职责：渲染 WorkflowControls（垂直按钮组）或 WorkflowMenubar（水平菜单栏），
 * 并封装「未保存时禁止操作」的守卫逻辑。
 */
export function CanvasControls({
  showControls,
  useMenubar,
  workflowName,
  workflowId,
  onRun,
  onDebugRun,
  onCancel,
  onSave,
  onExport,
  onAiExport,
  onImport,
  onSettings,
  openScheduleDialog,
  openSchedulePanel,
  openRunHistoryPanel,
  showToast,
  onEventStoreToggle,
  eventStoreEnabled,
  onZoomIn,
  onZoomOut,
  onFitView,
  onCollapseNodes,
  onExpandNodes,
  onAutoLayout,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isRunning,
  isSaving,
}: CanvasControlsProps) {
  if (!showControls) {
    return null
  }

  const handleSchedule = () => {
    if (workflowName) {
      openScheduleDialog(workflowName)
    } else {
      showToast('error', '请先保存工作流', '只有保存的工作流才能创建调度')
    }
  }

  const handleScheduleList = () => {
    if (workflowName) {
      openSchedulePanel(workflowName)
    } else {
      showToast('error', '请先保存工作流', '只有保存的工作流才能查看调度')
    }
  }

  const handleRunHistory = () => {
    if (workflowId) {
      openRunHistoryPanel(workflowId)
    } else {
      showToast('error', '请先保存工作流', '只有保存的工作流才能查看运行历史')
    }
  }

  const commonProps = {
    className: 'absolute left-4 top-4 z-[5]',
    onRun,
    onDebugRun,
    onCancel,
    onSave,
    onExport,
    onAiExport,
    onImport,
    onSettings,
    onSchedule: handleSchedule,
    onScheduleList: handleScheduleList,
    onRunHistory: handleRunHistory,
    onZoomIn,
    onZoomOut,
    onFitView,
    onCollapseNodes,
    onExpandNodes,
    onAutoLayout,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    isRunning,
    isSaving,
  }

  if (useMenubar) {
    return <WorkflowMenubar {...commonProps} />
  }

  return (
    <WorkflowControls
      {...commonProps}
      onEventStoreToggle={onEventStoreToggle}
      eventStoreEnabled={eventStoreEnabled}
    />
  )
}
