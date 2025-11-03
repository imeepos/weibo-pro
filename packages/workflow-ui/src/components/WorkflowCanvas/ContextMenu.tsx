'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { useNodeRegistry } from '../NodePalette/useNodeRegistry'
import type { NodeMetadata } from '../../types'
import type { ContextMenuState } from './useContextMenu'

export interface ContextMenuProps {
  menu: ContextMenuState
  onAddNode: (metadata: NodeMetadata) => void
  onFitView: () => void
  onCenterView: () => void
  onResetZoom: () => void
  onSelectAll: () => void
  onClearCanvas: () => void
  onClose: () => void
}

export function ContextMenu({
  menu,
  onAddNode,
  onFitView,
  onCenterView,
  onResetZoom,
  onSelectAll,
  onClearCanvas,
  onClose,
}: ContextMenuProps) {
  console.log('[ContextMenu] Rendering', { visible: menu.visible, position: menu.screenPosition })

  if (!menu.visible) {
    console.log('[ContextMenu] Menu not visible, returning null')
    return null
  }

  console.log('[ContextMenu] Menu is visible, rendering')

  const nodeRegistry = useNodeRegistry()

  const handleNodeClick = (metadata: NodeMetadata) => {
    onAddNode(metadata)
    onClose()
  }

  const handleActionClick = (action: () => void) => {
    action()
    onClose()
  }

  const menuContent = (
    <div
      className="context-menu min-w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
      style={{
        position: 'fixed',
        left: menu.screenPosition.x,
        top: menu.screenPosition.y,
        zIndex: 1000,
      }}
    >
      <div className="context-menu-section py-2">
        <div className="context-menu-section-header px-3 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
          添加节点
        </div>
        <div className="context-menu-items max-h-96 overflow-y-auto">
          {nodeRegistry.length === 0 ? (
            <div className="context-menu-empty px-3 py-2 text-sm text-gray-400">
              暂无可用节点
            </div>
          ) : (
            nodeRegistry.map((metadata) => (
              <div
                key={metadata.type}
                className="context-menu-item cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleNodeClick(metadata)}
              >
                <span className="context-menu-item-label block text-sm font-medium text-gray-900 dark:text-gray-100">
                  {metadata.label}
                </span>
                <div className="context-menu-item-details mt-1 flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {metadata.inputs.length > 0 && (
                    <span className="context-menu-item-meta">
                      输入: {metadata.inputs.length}
                    </span>
                  )}
                  {metadata.outputs.length > 0 && (
                    <span className="context-menu-item-meta">
                      输出: {metadata.outputs.length}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="context-menu-divider border-t border-gray-200 dark:border-gray-700" />

      <div className="context-menu-section py-2">
        <div className="context-menu-section-header px-3 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
          视图控制
        </div>
        <div className="context-menu-items">
          <div
            className="context-menu-item cursor-pointer px-3 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
            onClick={() => handleActionClick(onFitView)}
          >
            <span className="context-menu-item-label">适应窗口</span>
          </div>
          <div
            className="context-menu-item cursor-pointer px-3 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
            onClick={() => handleActionClick(onCenterView)}
          >
            <span className="context-menu-item-label">居中显示</span>
          </div>
          <div
            className="context-menu-item cursor-pointer px-3 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
            onClick={() => handleActionClick(onResetZoom)}
          >
            <span className="context-menu-item-label">重置缩放</span>
          </div>
        </div>
      </div>

      <div className="context-menu-divider border-t border-gray-200 dark:border-gray-700" />

      <div className="context-menu-section py-2">
        <div className="context-menu-section-header px-3 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
          画布操作
        </div>
        <div className="context-menu-items">
          <div
            className="context-menu-item cursor-pointer px-3 py-2 text-sm text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
            onClick={() => handleActionClick(onSelectAll)}
          >
            <span className="context-menu-item-label">全选</span>
          </div>
          <div
            className="context-menu-item context-menu-item-danger cursor-pointer px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            onClick={() => handleActionClick(onClearCanvas)}
          >
            <span className="context-menu-item-label">清空画布</span>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(menuContent, document.body)
    : null
}
