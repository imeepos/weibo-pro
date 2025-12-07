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
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@sker/ui/components/ui/menubar'

export interface WorkflowMenubarProps {
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
  return (
    <Menubar className={cn('shadow-lg shadow-black/20 dark:shadow-black/40', className)}>
      {/* 文件菜单 */}
      {(onSave || onImport || onExport || onSettings) && (
        <MenubarMenu>
          <MenubarTrigger>文件</MenubarTrigger>
          <MenubarContent>
            {onSave && (
              <MenubarItem onSelect={onSave} disabled={isSaving}>
                <SaveIcon className="mr-2 h-4 w-4" />
                {isSaving ? '保存中...' : '保存工作流'}
                <MenubarShortcut>⌘S</MenubarShortcut>
              </MenubarItem>
            )}
            {onImport && (
              <MenubarItem onSelect={onImport}>
                <UploadIcon className="mr-2 h-4 w-4" />
                导入工作流
              </MenubarItem>
            )}
            {onExport && (
              <MenubarItem onSelect={onExport}>
                <Download className="mr-2 h-4 w-4" />
                导出工作流
              </MenubarItem>
            )}
            {onSettings && (onSave || onImport || onExport) && <MenubarSeparator />}
            {onSettings && (
              <MenubarItem onSelect={onSettings}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                工作流设置
              </MenubarItem>
            )}
          </MenubarContent>
        </MenubarMenu>
      )}

      {/* 编辑菜单 */}
      {(onUndo || onRedo) && (
        <MenubarMenu>
          <MenubarTrigger>编辑</MenubarTrigger>
          <MenubarContent>
            {onUndo && (
              <MenubarItem onSelect={onUndo} disabled={!canUndo}>
                <Undo className="mr-2 h-4 w-4" />
                撤销
                <MenubarShortcut>⌘Z</MenubarShortcut>
              </MenubarItem>
            )}
            {onRedo && (
              <MenubarItem onSelect={onRedo} disabled={!canRedo}>
                <Redo className="mr-2 h-4 w-4" />
                重做
                <MenubarShortcut>⌘⇧Z</MenubarShortcut>
              </MenubarItem>
            )}
          </MenubarContent>
        </MenubarMenu>
      )}

      {/* 视图菜单 */}
      {(onZoomIn || onZoomOut || onFitView || onCollapseNodes || onExpandNodes) && (
        <MenubarMenu>
          <MenubarTrigger>视图</MenubarTrigger>
          <MenubarContent>
            {onZoomIn && (
              <MenubarItem onSelect={onZoomIn}>
                <ZoomIn className="mr-2 h-4 w-4" />
                放大
              </MenubarItem>
            )}
            {onZoomOut && (
              <MenubarItem onSelect={onZoomOut}>
                <ZoomOut className="mr-2 h-4 w-4" />
                缩小
              </MenubarItem>
            )}
            {onFitView && (
              <MenubarItem onSelect={onFitView}>
                <Maximize2 className="mr-2 h-4 w-4" />
                适应视图
              </MenubarItem>
            )}
            {(onCollapseNodes || onExpandNodes) && (onZoomIn || onZoomOut || onFitView) && (
              <MenubarSeparator />
            )}
            {onCollapseNodes && (
              <MenubarItem onSelect={onCollapseNodes}>
                <Minimize2 className="mr-2 h-4 w-4" />
                折叠节点
                <MenubarShortcut>⌘⇧C</MenubarShortcut>
              </MenubarItem>
            )}
            {onExpandNodes && (
              <MenubarItem onSelect={onExpandNodes}>
                <Maximize2 className="mr-2 h-4 w-4" />
                展开节点
                <MenubarShortcut>⌘⇧E</MenubarShortcut>
              </MenubarItem>
            )}
          </MenubarContent>
        </MenubarMenu>
      )}

      {/* 布局菜单 */}
      {onAutoLayout && (
        <MenubarMenu>
          <MenubarTrigger>布局</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={onAutoLayout}>
              <LayoutGrid className="mr-2 h-4 w-4" />
              自动布局
              <MenubarShortcut>⌘⇧L</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      )}

      {/* 运行菜单 */}
      {(onRun || onCancel || onSchedule || onScheduleList || onRunHistory) && (
        <MenubarMenu>
          <MenubarTrigger>运行</MenubarTrigger>
          <MenubarContent>
            {(onRun || onCancel) && (
              <MenubarItem
                onSelect={isRunning ? onCancel : onRun}
                variant={isRunning ? 'destructive' : 'default'}
              >
                {isRunning ? (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    取消运行
                  </>
                ) : (
                  <>
                    <PlayIcon className="mr-2 h-4 w-4" />
                    运行工作流
                  </>
                )}
              </MenubarItem>
            )}
            {(onSchedule || onScheduleList || onRunHistory) && (onRun || onCancel) && (
              <MenubarSeparator />
            )}
            {onSchedule && (
              <MenubarItem onSelect={onSchedule}>
                <Clock className="mr-2 h-4 w-4" />
                创建调度
              </MenubarItem>
            )}
            {onScheduleList && (
              <MenubarItem onSelect={onScheduleList}>
                <Clock className="mr-2 h-4 w-4" />
                调度管理
              </MenubarItem>
            )}
            {onRunHistory && (
              <MenubarItem onSelect={onRunHistory}>
                <History className="mr-2 h-4 w-4" />
                运行历史
              </MenubarItem>
            )}
          </MenubarContent>
        </MenubarMenu>
      )}
    </Menubar>
  )
}

WorkflowMenubar.displayName = 'WorkflowMenubar'
