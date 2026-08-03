'use client'

import React, { useMemo } from 'react'
import {
  WorkflowContextMenu,
  type MenuSection,
} from '@sker/ui/components/workflow'
import type { ContextMenuState } from './useContextMenu'
import {
  buildCanvasSections,
  buildNodeSections,
  buildEdgeSections,
  type ContextMenuBuildProps,
} from './context-menu-sections'

export interface ContextMenuProps {
  menu: ContextMenuState
  onFitView: () => void
  onCenterView: () => void
  onResetZoom: () => void
  onSelectAll: () => void
  onClearCanvas: () => void
  onDeleteNode?: (nodeId: string) => void
  onRunNode?: (nodeId: string) => void
  onRunNodeIsolated?: (nodeId: string) => void
  onToggleNodeCollapse?: (nodeId: string) => void
  onDeleteEdge?: (edgeId: string) => void
  onConfigEdge?: (edgeId: string) => void
  onCreateGroup?: () => void
  onUngroupNodes?: () => void
  onCollapseNodes?: () => void
  onExpandNodes?: () => void
  onAutoLayout?: () => void
  onToggleEntryNode?: (nodeId: string) => void
  onToggleEndNode?: (nodeId: string) => void
  onClose: () => void
  nodeData?: any
  hasMultipleSelectedNodes?: boolean
  isGroupNode?: boolean
  selectedNodesCount?: number
  isEntryNode?: boolean
  isEndNode?: boolean
}

/**
 * 右键菜单适配器
 *
 * 职责：
 * - 根据上下文类型（画布/节点/边）构建菜单项
 * - 将业务逻辑转换为纯展示组件所需的数据结构
 */
export function ContextMenu({
  menu,
  onFitView,
  onCenterView,
  onResetZoom,
  onSelectAll,
  onClearCanvas,
  onDeleteNode,
  onRunNode,
  onRunNodeIsolated,
  onToggleNodeCollapse,
  onDeleteEdge,
  onConfigEdge,
  onCreateGroup,
  onUngroupNodes,
  onCollapseNodes,
  onExpandNodes,
  onAutoLayout,
  onToggleEntryNode,
  onToggleEndNode,
  onClose,
  nodeData,
  hasMultipleSelectedNodes = false,
  isGroupNode = false,
  selectedNodesCount = 0,
  isEntryNode = false,
  isEndNode = false,
}: ContextMenuProps) {
  // 根据上下文构建菜单项
  const sections = useMemo<MenuSection[]>(() => {
    const buildProps: ContextMenuBuildProps = {
      onFitView,
      onCenterView,
      onResetZoom,
      onSelectAll,
      onClearCanvas,
      onDeleteNode,
      onRunNode,
      onRunNodeIsolated,
      onToggleNodeCollapse,
      onDeleteEdge,
      onConfigEdge,
      onCreateGroup,
      onUngroupNodes,
      onCollapseNodes,
      onExpandNodes,
      onAutoLayout,
      onToggleEntryNode,
      onToggleEndNode,
      nodeData,
      hasMultipleSelectedNodes,
      isGroupNode,
      selectedNodesCount,
      isEntryNode,
      isEndNode,
      nodeId: menu.targetId,
      edgeId: menu.targetId,
    }

    if (menu.contextType === 'canvas') {
      return buildCanvasSections(buildProps)
    } else if (menu.contextType === 'node' && menu.targetId) {
      return buildNodeSections(buildProps)
    } else if (menu.contextType === 'edge' && menu.targetId) {
      return buildEdgeSections(buildProps)
    }

    return []
  }, [
    menu.contextType,
    menu.targetId,
    selectedNodesCount,
    nodeData?.collapsed,
    hasMultipleSelectedNodes,
    isGroupNode,
    isEntryNode,
    isEndNode,
    onCollapseNodes,
    onExpandNodes,
    onAutoLayout,
    onFitView,
    onCenterView,
    onResetZoom,
    onSelectAll,
    onClearCanvas,
    onRunNodeIsolated,
    onRunNode,
    onToggleNodeCollapse,
    onDeleteNode,
    onCreateGroup,
    onUngroupNodes,
    onConfigEdge,
    onDeleteEdge,
    onToggleEntryNode,
    onToggleEndNode,
  ])

  return (
    <WorkflowContextMenu
      visible={menu.visible}
      position={menu.screenPosition}
      sections={sections}
      onClose={onClose}
    />
  )
}
