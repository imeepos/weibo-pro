'use client'

import React from 'react'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  UploadIcon,
  LayoutGrid,
  Undo,
  Redo,
  FileCode,
} from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'
import { Button } from '@sker/ui/components/ui/button'

import { controlButtonClassName } from './workflow-controls-types.js'

export interface HistoryControlsProps {
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

/** 撤销 / 重做 */
export const HistoryControls: React.FC<HistoryControlsProps> = ({
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  return (
    <>
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
            controlButtonClassName,
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
            controlButtonClassName,
            'disabled:opacity-30 disabled:cursor-not-allowed'
          )}
        >
          <Redo className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}
    </>
  )
}

export interface ViewControlsProps {
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void
}

/** 缩放 / 适应视图 */
export const ViewControls: React.FC<ViewControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onFitView,
}) => {
  return (
    <>
      {onZoomIn && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onZoomIn}
          title="放大"
          className={controlButtonClassName}
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
          className={controlButtonClassName}
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
          className={controlButtonClassName}
        >
          <Maximize2 className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}
    </>
  )
}

export interface FileControlsProps {
  onImport?: () => void
  onExport?: () => void
  onAiExport?: () => void
}

/** 导入 / 导出 */
export const FileControls: React.FC<FileControlsProps> = ({
  onImport,
  onExport,
  onAiExport,
}) => {
  return (
    <>
      {onImport && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onImport}
          title="导入工作流"
          className={controlButtonClassName}
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
          className={controlButtonClassName}
        >
          <Download className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}

      {onAiExport && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onAiExport}
          title="导出AI分析格式&#10;自动截断长文本，方便复制到AI开发工具"
          className={controlButtonClassName}
        >
          <FileCode className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}
    </>
  )
}

export interface LayoutControlsProps {
  onCollapseNodes?: () => void
  onExpandNodes?: () => void
  onAutoLayout?: () => void
}

/** 折叠 / 展开 / 自动布局 */
export const LayoutControls: React.FC<LayoutControlsProps> = ({
  onCollapseNodes,
  onExpandNodes,
  onAutoLayout,
}) => {
  return (
    <>
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
          className={controlButtonClassName}
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
          className={controlButtonClassName}
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
            className={controlButtonClassName}
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={2} />
          </Button>
        </>
      )}
    </>
  )
}
