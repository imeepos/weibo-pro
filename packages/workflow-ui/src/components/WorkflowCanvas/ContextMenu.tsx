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
  type LucideIcon,
} from 'lucide-react'
import type { ContextMenuState } from './useContextMenu'

export interface ContextMenuProps {
  menu: ContextMenuState
  onFitView: () => void
  onCenterView: () => void
  onResetZoom: () => void
  onSelectAll: () => void
  onClearCanvas: () => void
  onDeleteNode?: (nodeId: string) => void
  onRunNode?: (nodeId: string) => void
  onDeleteEdge?: (edgeId: string) => void
  onClose: () => void
}

export function ContextMenu({
  menu,
  onFitView,
  onCenterView,
  onResetZoom,
  onSelectAll,
  onClearCanvas,
  onDeleteNode,
  onRunNode,
  onDeleteEdge,
  onClose,
}: ContextMenuProps) {
  if (!menu.visible) {
    return null
  }

  const handleActionClick = (action: () => void) => {
    action()
    onClose()
  }

  interface MenuSection {
    title: string
    items: Array<{
      label: string
      icon: LucideIcon
      action: () => void
      danger?: boolean
    }>
  }

  let sections: MenuSection[] = []

  if (menu.contextType === 'canvas') {
    sections = [
      {
        title: '视图控制',
        items: [
          { label: '适应窗口', icon: Maximize2, action: onFitView },
          { label: '居中显示', icon: Crosshair, action: onCenterView },
          { label: '重置缩放', icon: RotateCcw, action: onResetZoom },
        ],
      },
      {
        title: '画布操作',
        items: [
          { label: '全选', icon: CheckSquare, action: onSelectAll },
          { label: '清空画布', icon: Trash2, action: onClearCanvas, danger: true },
        ],
      },
    ]
  } else if (menu.contextType === 'node' && menu.targetId) {
    const nodeId = menu.targetId
    sections = [
      {
        title: '节点操作',
        items: [
          ...(onRunNode
            ? [
                {
                  label: '运行节点',
                  icon: Play,
                  action: () => onRunNode(nodeId),
                },
              ]
            : []),
          ...(onDeleteNode
            ? [
                {
                  label: '删除节点',
                  icon: Trash2,
                  action: () => onDeleteNode(nodeId),
                  danger: true,
                },
              ]
            : []),
        ],
      },
    ]
  } else if (menu.contextType === 'edge' && menu.targetId) {
    const edgeId = menu.targetId
    sections = [
      {
        title: '连接操作',
        items: [
          ...(onDeleteEdge
            ? [
                {
                  label: '删除连接',
                  icon: Trash2,
                  action: () => onDeleteEdge(edgeId),
                  danger: true,
                },
              ]
            : []),
        ],
      },
    ]
  }

  const menuContent = (
    <div
      className="context-menu min-w-56 rounded-xl border border-[#2f3543] bg-[#111318] p-2 shadow-2xl shadow-black/40 backdrop-blur-xl"
      style={{
        position: 'fixed',
        left: menu.screenPosition.x,
        top: menu.screenPosition.y,
        zIndex: 1000,
      }}
      role="menu"
    >
      {sections.map((section, sectionIndex) => (
        <div
          className={sectionIndex === 0 ? 'py-2' : 'border-t border-[#2f3543] py-2'}
          key={section.title}
        >
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6c7a91]">
            {section.title}
          </div>
          <div className="flex flex-col gap-1 px-1">
            {section.items.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition focus:outline-none ${
                  item.danger
                    ? 'text-[#f87171] hover:bg-[#3b1f28]'
                    : 'text-[#e5e9f5] hover:bg-[#1f2531]'
                }`}
                onClick={() => handleActionClick(item.action)}
              >
                <item.icon
                  className={`h-4 w-4 ${
                    item.danger ? 'text-[#f87171]' : 'text-[#135bec]'
                  }`}
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
