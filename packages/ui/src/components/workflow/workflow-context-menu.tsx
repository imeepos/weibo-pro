'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import {
  CheckSquare,
  Crosshair,
  Maximize2,
  RotateCcw,
  Trash2,
  Play,
  Settings,
  Minimize2,
  FolderPlus,
  FolderMinus,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@sker/ui/lib/utils'

export interface MenuItem {
  label: string
  icon: LucideIcon
  action: () => void
  danger?: boolean
}

export interface MenuSection {
  title: string
  items: MenuItem[]
}

export interface WorkflowContextMenuProps {
  visible: boolean
  position: { x: number; y: number }
  sections: MenuSection[]
  onClose: () => void
  className?: string
}

/**
 * 工作流右键菜单
 *
 * 纯展示组件：负责渲染菜单项和触发事件
 */
export const WorkflowContextMenu: React.FC<WorkflowContextMenuProps> = ({
  visible,
  position,
  sections,
  onClose,
  className,
}) => {
  if (!visible) {
    return null
  }

  const handleActionClick = (action: () => void) => {
    action()
    onClose()
  }

  const menuContent = (
    <div
      className={cn(
        'workflow-context-menu min-w-56 rounded-xl border border-border',
        'bg-popover p-2 shadow-2xl shadow-black/40 backdrop-blur-xl',
        className
      )}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
      }}
      role="menu"
    >
      {sections.map((section, sectionIndex) => (
        <div
          className={cn(
            sectionIndex === 0 ? 'py-2' : 'border-t border-border py-2'
          )}
          key={section.title}
        >
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {section.title}
          </div>
          <div className="flex flex-col gap-1 px-1">
            {section.items.map((item) => (
              <button
                key={item.label}
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm',
                  'transition focus:outline-none',
                  item.danger
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-foreground hover:bg-accent'
                )}
                onClick={() => handleActionClick(item.action)}
              >
                <item.icon
                  className={cn(
                    'h-4 w-4',
                    item.danger ? 'text-destructive' : 'text-primary'
                  )}
                  strokeWidth={1.8}
                />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(menuContent, document.body)
    : null
}

WorkflowContextMenu.displayName = 'WorkflowContextMenu'

// 导出图标以供业务层使用
export {
  CheckSquare,
  Crosshair,
  Maximize2,
  RotateCcw,
  Trash2,
  Play,
  Settings,
  Minimize2,
  FolderPlus,
  FolderMinus,
  LayoutGrid,
}
