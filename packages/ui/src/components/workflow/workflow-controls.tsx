'use client'

import React from 'react'
import { cn } from '@sker/ui/lib/utils'

import type { WorkflowControlsProps } from './workflow-controls-types.js'
import {
  FileControls,
  HistoryControls,
  LayoutControls,
  ViewControls,
} from './workflow-controls-actions.js'
import { RunControls } from './workflow-controls-run.js'

export type { WorkflowControlsProps } from './workflow-controls-types.js'

/**
 * 工作流控制面板
 *
 * 纯展示组件：只负责渲染按钮和触发事件
 */
export const WorkflowControls: React.FC<WorkflowControlsProps> = ({
  onRun,
  onDebugRun,
  onCancel,
  onSave,
  onExport,
  onAiExport,
  onImport,
  onSettings,
  onScheduleList,
  onRunHistory,
  onEventStoreToggle,
  onZoomIn,
  onZoomOut,
  onFitView,
  onCollapseNodes,
  onExpandNodes,
  onAutoLayout,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isRunning = false,
  isSaving = false,
  eventStoreEnabled = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-border bg-card p-1.5',
        'shadow-lg shadow-black/20 dark:shadow-black/40',
        className
      )}
    >
      <RunControls
        onRun={onRun}
        onDebugRun={onDebugRun}
        onCancel={onCancel}
        onSave={onSave}
        onSettings={onSettings}
        onScheduleList={onScheduleList}
        onRunHistory={onRunHistory}
        onEventStoreToggle={onEventStoreToggle}
        isRunning={isRunning}
        isSaving={isSaving}
        eventStoreEnabled={eventStoreEnabled}
      />

      <HistoryControls
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <ViewControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} onFitView={onFitView} />

      <FileControls onImport={onImport} onExport={onExport} onAiExport={onAiExport} />

      <LayoutControls
        onCollapseNodes={onCollapseNodes}
        onExpandNodes={onExpandNodes}
        onAutoLayout={onAutoLayout}
      />
    </div>
  )
}

WorkflowControls.displayName = 'WorkflowControls'
