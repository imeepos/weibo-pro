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
} from 'lucide-react'

export interface CanvasControlsProps {
  // 工作流操作
  onRunWorkflow?: () => void
  onSaveWorkflow?: () => void
  onExportWorkflow?: () => void
  onImportWorkflow?: () => void
  onOpenWorkflowSettings?: () => void

  // 视图控制
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void
  onCenterView?: () => void
  onResetZoom?: () => void

  // 节点操作
  onCollapseNodes?: () => void
  onExpandNodes?: () => void
  onAutoLayout?: () => void

  // 状态
  isRunning?: boolean
  isSaving?: boolean

  // 配置
  className?: string
}

/**
 * 画布控制面板
 *
 * 优雅设计：
 * - 纯粹的UI组件，只负责渲染和事件触发
 * - 不包含任何业务逻辑
 * - 所有操作都通过回调函数委托给父组件
 */
export const CanvasControls: React.FC<CanvasControlsProps> = ({
  // 工作流操作
  onRunWorkflow,
  onSaveWorkflow,
  onExportWorkflow,
  onImportWorkflow,
  onOpenWorkflowSettings,

  // 视图控制
  onZoomIn,
  onZoomOut,
  onFitView,
  onCenterView,
  onResetZoom,

  // 节点操作
  onCollapseNodes,
  onExpandNodes,
  onAutoLayout,

  // 状态
  isRunning = false,
  isSaving = false,

  // 配置
  className = ''
}) => {
  return (
    <div className={`absolute bottom-60 right-4 z-[5] flex flex-col gap-2 rounded-xl border border-[#282e39] bg-[#111318] p-1.5 shadow-lg shadow-black/30 ${className}`}>
      {/* 运行按钮 */}
      <button
        onClick={onRunWorkflow}
        disabled={isRunning}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318] disabled:opacity-50 disabled:cursor-not-allowed"
        title={isRunning ? '运行中...' : '运行工作流'}>
        <PlayIcon className="h-4 w-4" strokeWidth={2} />
      </button>

      {/* 工作流设置 */}
      <button
        onClick={onOpenWorkflowSettings}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
        title="工作流设置">
        <SettingsIcon className="h-4 w-4" strokeWidth={2} />
      </button>

      {/* 保存按钮 */}
      <button
        onClick={onSaveWorkflow}
        disabled={isSaving}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318] disabled:opacity-50 disabled:cursor-not-allowed"
        title={isSaving ? '保存中...' : '保存工作流'}>
        <SaveIcon className="h-4 w-4" strokeWidth={2} />
      </button>

      {/* 缩放控制 */}
      <button
        onClick={onZoomIn}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
        title="放大">
        <ZoomIn className="h-4 w-4" strokeWidth={2} />
      </button>

      <button
        onClick={onZoomOut}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
        title="缩小">
        <ZoomOut className="h-4 w-4" strokeWidth={2} />
      </button>

      <button
        onClick={onFitView}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
        title="适应视图">
        <Maximize2 className="h-4 w-4" strokeWidth={2} />
      </button>

      {/* 导入导出 */}
      <button
        onClick={onImportWorkflow}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
        title="导入工作流">
        <UploadIcon className="h-4 w-4" strokeWidth={2} />
      </button>

      <button
        onClick={onExportWorkflow}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
        title="导出工作流">
        <Download className="h-4 w-4" strokeWidth={2} />
      </button>

      {/* 分隔线 */}
      <div className="my-1 h-px bg-[#282e39]" />

      {/* 折叠/展开按钮组 */}
      <button
        onClick={onCollapseNodes}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
        title="折叠节点（有选中时仅折叠选中的，无选中时折叠全部）&#10;快捷键: Ctrl+Shift+C">
        <Minimize2 className="h-4 w-4" strokeWidth={2} />
      </button>

      <button
        onClick={onExpandNodes}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
        title="展开节点（有选中时仅展开选中的，无选中时展开全部）&#10;快捷键: Ctrl+Shift+E">
        <Maximize2 className="h-4 w-4" strokeWidth={2} />
      </button>

      {/* 分隔线 */}
      <div className="my-1 h-px bg-[#282e39]" />

      {/* 自动布局按钮 */}
      <button
        onClick={onAutoLayout}
        className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
        title="自动布局（基于拓扑结构重新排列节点）&#10;快捷键: Ctrl+Shift+L">
        <LayoutGrid className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  )
}

CanvasControls.displayName = 'CanvasControls'