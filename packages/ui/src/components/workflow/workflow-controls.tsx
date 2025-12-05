'use client'

import React from 'react'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  PlayIcon,
  SaveIcon,
  SettingsIcon,
  Download,
  UploadIcon,
  LayoutGrid,
  Clock,
  XCircle,
  History,
  Undo,
  Redo,
} from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'
import { Button } from '@sker/ui/components/ui/button'

export interface WorkflowControlsProps {
  // 工作流操作
  onRun?: () => void
  onCancel?: () => void
  onSave?: () => void
  onExport?: () => void
  onImport?: () => void
  onSettings?: () => void
  onSchedule?: () => void
  onScheduleList?: () => void
  onRunHistory?: () => void

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

  // 样式
  className?: string
}

/**
 * 工作流控制面板
 *
 * 纯展示组件：只负责渲染按钮和触发事件
 */
export const WorkflowControls: React.FC<WorkflowControlsProps> = ({
  onRun,
  onCancel,
  onSave,
  onExport,
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
  const buttonClassName = 'h-9 w-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground'

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-border bg-card p-1.5',
        'shadow-lg shadow-black/20 dark:shadow-black/40',
        className
      )}
    >
      {/* 运行 / 取消 */}
      {(onRun || onCancel) && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={isRunning ? onCancel : onRun}
          title={isRunning ? '取消运行' : '运行工作流'}
          className={cn(
            buttonClassName,
            isRunning && 'text-destructive hover:text-destructive hover:bg-destructive/10'
          )}
        >
          {isRunning ? (
            <XCircle className="h-4 w-4" strokeWidth={2} />
          ) : (
            <PlayIcon className="h-4 w-4" strokeWidth={2} />
          )}
        </Button>
      )}

      {/* 设置 */}
      {onSettings && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSettings}
          title="工作流设置"
          className={buttonClassName}
        >
          <SettingsIcon className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 调度 */}
      {onScheduleList && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onScheduleList}
          title="调度管理"
          className={buttonClassName}
        >
          <Clock className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 运行历史 */}
      {onRunHistory && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRunHistory}
          title="运行历史"
          className={buttonClassName}
        >
          <History className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 保存 */}
      {onSave && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSave}
          disabled={isSaving}
          title={isSaving ? '保存中...' : '保存工作流'}
          className={cn(
            buttonClassName,
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <SaveIcon className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 分隔线 */}
      {(onUndo || onRedo) && <div className="my-1 h-px bg-border" />}

      {/* 撤销 */}
      {onUndo && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销&#10;快捷键: Ctrl+Z"
          className={cn(
            buttonClassName,
            'disabled:opacity-30 disabled:cursor-not-allowed'
          )}
        >
          <Undo className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 重做 */}
      {onRedo && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="重做&#10;快捷键: Ctrl+Shift+Z"
          className={cn(
            buttonClassName,
            'disabled:opacity-30 disabled:cursor-not-allowed'
          )}
        >
          <Redo className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 缩放控制 */}
      {onZoomIn && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onZoomIn}
          title="放大"
          className={buttonClassName}
        >
          <ZoomIn className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {onZoomOut && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onZoomOut}
          title="缩小"
          className={buttonClassName}
        >
          <ZoomOut className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {onFitView && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onFitView}
          title="适应视图"
          className={buttonClassName}
        >
          <Maximize2 className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 导入导出 */}
      {onImport && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onImport}
          title="导入工作流"
          className={buttonClassName}
        >
          <UploadIcon className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {onExport && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onExport}
          title="导出工作流"
          className={buttonClassName}
        >
          <Download className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 分隔线 */}
      {(onCollapseNodes || onExpandNodes || onAutoLayout) && (
        <div className="my-1 h-px bg-border" />
      )}

      {/* 折叠/展开 */}
      {onCollapseNodes && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCollapseNodes}
          title="折叠节点（有选中时仅折叠选中的，无选中时折叠全部）&#10;快捷键: Ctrl+Shift+C"
          className={buttonClassName}
        >
          <Minimize2 className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {onExpandNodes && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onExpandNodes}
          title="展开节点（有选中时仅展开选中的，无选中时展开全部）&#10;快捷键: Ctrl+Shift+E"
          className={buttonClassName}
        >
          <Maximize2 className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 自动布局 */}
      {onAutoLayout && (
        <>
          <div className="my-1 h-px bg-border" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onAutoLayout}
            title="自动布局（基于拓扑结构重新排列节点）&#10;快捷键: Ctrl+Shift+L"
            className={buttonClassName}
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={2} />
          </Button>
        </>
      )}
    </div>
  )
}

WorkflowControls.displayName = 'WorkflowControls'
