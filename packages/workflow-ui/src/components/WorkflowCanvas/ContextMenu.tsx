'use client'

import React, { useMemo } from 'react'
import {
  WorkflowContextMenu,
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
  PlayCircle,
  StopCircle,
  type MenuSection,
} from '@sker/ui/components/workflow'
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
    if (menu.contextType === 'canvas') {
      return [
        {
          title: '节点操作',
          items: [
            ...(onCollapseNodes
              ? [
                  {
                    label: selectedNodesCount > 0
                      ? `折叠选中 (${selectedNodesCount})`
                      : '折叠全部',
                    icon: Minimize2,
                    action: onCollapseNodes,
                  },
                ]
              : []),
            ...(onExpandNodes
              ? [
                  {
                    label: selectedNodesCount > 0
                      ? `展开选中 (${selectedNodesCount})`
                      : '展开全部',
                    icon: Maximize2,
                    action: onExpandNodes,
                  },
                ]
              : []),
          ],
        },
        {
          title: '布局',
          items: [
            ...(onAutoLayout
              ? [
                  {
                    label: '自动布局',
                    icon: LayoutGrid,
                    action: onAutoLayout,
                  },
                ]
              : []),
          ],
        },
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
      const isCollapsed = nodeData?.collapsed ?? false
      return [
        {
          title: '节点操作',
          items: [
            ...(onRunNodeIsolated
              ? [
                  {
                    label: '运行节点（测试）',
                    icon: Play,
                    action: () => onRunNodeIsolated(nodeId),
                  },
                ]
              : []),
            ...(onRunNode
              ? [
                  {
                    label: '运行节点及下游（更新）',
                    icon: Play,
                    action: () => onRunNode(nodeId),
                  },
                ]
              : []),
            ...(onToggleNodeCollapse
              ? [
                  {
                    label: isCollapsed ? '展开节点' : '折叠节点',
                    icon: isCollapsed ? Maximize2 : Minimize2,
                    action: () => onToggleNodeCollapse(nodeId),
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
        {
          title: '执行控制',
          items: [
            ...(onToggleEntryNode
              ? [
                  {
                    label: isEntryNode ? '取消起始节点' : '设为起始节点',
                    icon: PlayCircle,
                    action: () => onToggleEntryNode(nodeId),
                  },
                ]
              : []),
            ...(onToggleEndNode
              ? [
                  {
                    label: isEndNode ? '取消结束节点' : '设为结束节点',
                    icon: StopCircle,
                    action: () => onToggleEndNode(nodeId),
                  },
                ]
              : []),
          ],
        },
        ...(hasMultipleSelectedNodes || isGroupNode
          ? [
              {
                title: '分组操作',
                items: [
                  ...(hasMultipleSelectedNodes && onCreateGroup
                    ? [
                        {
                          label: '创建分组 (Ctrl+G)',
                          icon: FolderPlus,
                          action: onCreateGroup,
                        },
                      ]
                    : []),
                  ...(isGroupNode && onUngroupNodes
                    ? [
                        {
                          label: '解散分组 (Ctrl+Shift+G)',
                          icon: FolderMinus,
                          action: onUngroupNodes,
                        },
                      ]
                    : []),
                ],
              },
            ]
          : []),
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
    } else if (menu.contextType === 'edge' && menu.targetId) {
      const edgeId = menu.targetId
      return [
        {
          title: '边配置',
          items: [
            ...(onConfigEdge
              ? [
                  {
                    label: '配置边模式',
                    icon: Settings,
                    action: () => onConfigEdge(edgeId),
                  },
                ]
              : []),
          ],
        },
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
