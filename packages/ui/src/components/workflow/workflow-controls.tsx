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
} from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'
import { Button } from '@sker/ui/components/ui/button'

export interface WorkflowControlsProps {
  // 工作流操作
  onRun?: () => void
  onSave?: () => void
  onExport?: () => void
  onImport?: () => void
  onSettings?: () => void
  onSchedule?: () => void
  onScheduleList?: () => void

  // 视图控制
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void

  // 节点操作
  onCollapseNodes?: () => void
  onExpandNodes?: () => void
  onAutoLayout?: () => void

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
  onSave,
  onExport,
  onImport,
  onSettings,
  onSchedule,
  onScheduleList,
  onZoomIn,
  onZoomOut,
  onFitView,
  onCollapseNodes,
  onExpandNodes,
  onAutoLayout,
  isRunning = false,
  isSaving = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-[#282e39] bg-[#111318] p-1.5',
        'shadow-lg shadow-black/30',
        className
      )}
    >
      {/* 运行 */}
      {onRun && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRun}
          disabled={isRunning}
          title={isRunning ? '运行中...' : '运行工作流'}
          className={cn(
            'h-9 w-9 text-[#9da6b9] hover:bg-[#282e39] hover:text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <PlayIcon className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 设置 */}
      {onSettings && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSettings}
          title="工作流设置"
          className="h-9 w-9 text-[#9da6b9] hover:bg-[#282e39] hover:text-white"
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
          className="h-9 w-9 text-[#9da6b9] hover:bg-[#282e39] hover:text-white"
        >
          <Clock className="h-4 w-4" strokeWidth={2} />
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
            'h-9 w-9 text-[#9da6b9] hover:bg-[#282e39] hover:text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <SaveIcon className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 缩放控制 */}
      {onZoomIn && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onZoomIn}
          title="放大"
          className="h-9 w-9 text-[#9da6b9] hover:bg-[#282e39] hover:text-white"
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
          className="h-9 w-9 text-[#9da6b9] hover:bg-[#282e39] hover:text-white"
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
          className="h-9 w-9 text-[#9da6b9] hover:bg-[#282e39] hover:text-white"
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
          className="h-9 w-9 text-[#9da6b9] hover:bg-[#282e39] hover:text-white"
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
          className="h-9 w-9 text-[#9da6b9] hover:bg-[#282e39] hover:text-white"
        >
          <Download className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 分隔线 */}
      {(onCollapseNodes || onExpandNodes || onAutoLayout) && (
        <div className="my-1 h-px bg-[#282e39]" />
      )}

      {/* 折叠/展开 */}
      {onCollapseNodes && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCollapseNodes}
          title="折叠节点（有选中时仅折叠选中的，无选中时折叠全部）&#10;快捷键: Ctrl+Shift+C"
          className="h-9 w-9 text-[#9da6b9] hover:bg-[#282e39] hover:text-white"
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
          className="h-9 w-9 text-[#9da6b9] hover:bg-[#282e39] hover:text-white"
        >
          <Maximize2 className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {/* 自动布局 */}
      {onAutoLayout && (
        <>
          <div className="my-1 h-px bg-[#282e39]" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onAutoLayout}
            title="自动布局（基于拓扑结构重新排列节点）&#10;快捷键: Ctrl+Shift+L"
            className="h-9 w-9 text-[#9da6b9] hover:bg-[#282e39] hover:text-white"
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={2} />
          </Button>
        </>
      )}
    </div>
  )
}

WorkflowControls.displayName = 'WorkflowControls'
