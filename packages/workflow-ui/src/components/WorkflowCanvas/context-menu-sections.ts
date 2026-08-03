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
  PlayCircle,
  StopCircle,
  type MenuSection,
} from '@sker/ui/components/workflow'

export interface ContextMenuBuildProps {
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
  nodeData?: any
  hasMultipleSelectedNodes?: boolean
  isGroupNode?: boolean
  selectedNodesCount?: number
  isEntryNode?: boolean
  isEndNode?: boolean
  nodeId?: string
  edgeId?: string
}

function viewControlSections(props: ContextMenuBuildProps): MenuSection[] {
  return [
    {
      title: '视图控制',
      items: [
        { label: '适应窗口', icon: Maximize2, action: props.onFitView },
        { label: '居中显示', icon: Crosshair, action: props.onCenterView },
        { label: '重置缩放', icon: RotateCcw, action: props.onResetZoom },
      ],
    },
    {
      title: '画布操作',
      items: [
        { label: '全选', icon: CheckSquare, action: props.onSelectAll },
        { label: '清空画布', icon: Trash2, action: props.onClearCanvas, danger: true },
      ],
    },
  ]
}

export function buildCanvasSections(props: ContextMenuBuildProps): MenuSection[] {
  return [
    {
      title: '节点操作',
      items: [
        ...(props.onCollapseNodes
          ? [
              {
                label: props.selectedNodesCount! > 0
                  ? `折叠选中 (${props.selectedNodesCount})`
                  : '折叠全部',
                icon: Minimize2,
                action: props.onCollapseNodes,
              },
            ]
          : []),
        ...(props.onExpandNodes
          ? [
              {
                label: props.selectedNodesCount! > 0
                  ? `展开选中 (${props.selectedNodesCount})`
                  : '展开全部',
                icon: Maximize2,
                action: props.onExpandNodes,
              },
            ]
          : []),
      ],
    },
    {
      title: '布局',
      items: [
        ...(props.onAutoLayout
          ? [
              {
                label: '自动布局',
                icon: LayoutGrid,
                action: props.onAutoLayout,
              },
            ]
          : []),
      ],
    },
    ...viewControlSections(props),
  ]
}

export function buildNodeSections(props: ContextMenuBuildProps): MenuSection[] {
  const nodeId = props.nodeId!
  const isCollapsed = props.nodeData?.collapsed ?? false
  const hasMultipleSelectedNodes = props.hasMultipleSelectedNodes || false
  const isGroupNode = props.isGroupNode || false

  return [
    {
      title: '节点操作',
      items: [
        ...(props.onRunNodeIsolated
          ? [
              {
                label: '运行节点（测试）',
                icon: Play,
                action: () => props.onRunNodeIsolated!(nodeId),
              },
            ]
          : []),
        ...(props.onRunNode
          ? [
              {
                label: '运行节点及下游（更新）',
                icon: Play,
                action: () => props.onRunNode!(nodeId),
              },
            ]
          : []),
        ...(props.onToggleNodeCollapse
          ? [
              {
                label: isCollapsed ? '展开节点' : '折叠节点',
                icon: isCollapsed ? Maximize2 : Minimize2,
                action: () => props.onToggleNodeCollapse!(nodeId),
              },
            ]
          : []),
        ...(props.onDeleteNode
          ? [
              {
                label: '删除节点',
                icon: Trash2,
                action: () => props.onDeleteNode!(nodeId),
                danger: true,
              },
            ]
          : []),
      ],
    },
    {
      title: '执行控制',
      items: [
        ...(props.onToggleEntryNode
          ? [
              {
                label: props.isEntryNode ? '取消起始节点' : '设为起始节点',
                icon: PlayCircle,
                action: () => props.onToggleEntryNode!(nodeId),
              },
            ]
          : []),
        ...(props.onToggleEndNode
          ? [
              {
                label: props.isEndNode ? '取消结束节点' : '设为结束节点',
                icon: StopCircle,
                action: () => props.onToggleEndNode!(nodeId),
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
              ...(hasMultipleSelectedNodes && props.onCreateGroup
                ? [
                    {
                      label: '创建分组 (Ctrl+G)',
                      icon: FolderPlus,
                      action: props.onCreateGroup,
                    },
                  ]
                : []),
              ...(isGroupNode && props.onUngroupNodes
                ? [
                    {
                      label: '解散分组 (Ctrl+Shift+G)',
                      icon: FolderMinus,
                      action: props.onUngroupNodes,
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
    ...viewControlSections(props),
  ]
}

export function buildEdgeSections(props: ContextMenuBuildProps): MenuSection[] {
  const edgeId = props.edgeId!
  return [
    {
      title: '边配置',
      items: [
        ...(props.onConfigEdge
          ? [
              {
                label: '配置边模式',
                icon: Settings,
                action: () => props.onConfigEdge!(edgeId),
              },
            ]
          : []),
      ],
    },
    {
      title: '连接操作',
      items: [
        ...(props.onDeleteEdge
          ? [
              {
                label: '删除连接',
                icon: Trash2,
                action: () => props.onDeleteEdge!(edgeId),
                danger: true,
              },
            ]
          : []),
      ],
    },
    ...viewControlSections(props),
  ]
}
