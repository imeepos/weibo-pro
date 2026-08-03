'use client'

import React from 'react'
import { cn } from '@sker/ui/lib/utils'
import { Menubar } from '@sker/ui/components/ui/menubar'
import { FileMenu } from './workflow-menubar-file-menu'
import { EditMenu } from './workflow-menubar-edit-menu'
import { ViewMenu } from './workflow-menubar-view-menu'
import { LayoutMenu } from './workflow-menubar-layout-menu'
import { RunMenu } from './workflow-menubar-run-menu'

export type { WorkflowMenubarProps } from './workflow-menubar-types'

/**
 * 工作流菜单栏（水平布局）
 *
 * 使用 Menubar 组件重构的控制面板，按功能分类为：
 * - 文件：保存、导入、导出、设置
 * - 编辑：撤销、重做
 * - 视图：缩放、适应视图、折叠/展开节点
 * - 布局：自动布局
 * - 运行：运行/取消、调度管理、运行历史
 */
export const WorkflowMenubar: React.FC<WorkflowMenubarProps> = ({
  onRun,
  onDebugRun,
  onCancel,
  onSave,
  onExport,
  onAiExport,
  onImport,
  onSettings,
  onSchedule,
  onScheduleList,
  onRunHistory,
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
  className,
}) => {
  return (
    <Menubar className={cn('shadow-lg shadow-black/20 dark:shadow-black/40', className)}>
      <FileMenu
        onSave={onSave}
        isSaving={isSaving}
        onImport={onImport}
        onExport={onExport}
        onAiExport={onAiExport}
        onSettings={onSettings}
      />
      <EditMenu onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo} />
      <ViewMenu
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onFitView={onFitView}
        onCollapseNodes={onCollapseNodes}
        onExpandNodes={onExpandNodes}
      />
      <LayoutMenu onAutoLayout={onAutoLayout} />
      <RunMenu
        onRun={onRun}
        onDebugRun={onDebugRun}
        onCancel={onCancel}
        onSchedule={onSchedule}
        onScheduleList={onScheduleList}
        onRunHistory={onRunHistory}
        isRunning={isRunning}
      />
    </Menubar>
  )
}

WorkflowMenubar.displayName = 'WorkflowMenubar'
