import type {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeProps,
  EdgeProps,
  Viewport,
  ConnectionMode,
  SelectionMode,
  BackgroundVariant,
} from '@xyflow/react'

export interface WorkflowCanvasProps {
  // 核心配置
  nodes?: Node[]
  edges?: Edge[]
  nodeTypes?: Record<string, React.ComponentType<NodeProps>>
  edgeTypes?: Record<string, React.ComponentType<EdgeProps>>

  // 功能配置
  showControls?: boolean
  showMiniMap?: boolean
  showBackground?: boolean
  snapToGrid?: boolean
  fitViewOnInit?: boolean

  // React Flow 配置
  connectionMode?: ConnectionMode
  selectionMode?: SelectionMode
  backgroundVariant?: BackgroundVariant

  // 事件回调
  onNodesChange?: OnNodesChange
  onEdgesChange?: OnEdgesChange
  onConnect?: OnConnect
  onNodeClick?: (event: React.MouseEvent, node: Node) => void
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void
  onViewportChange?: (viewport: Viewport) => void

  // 样式配置
  className?: string
  style?: React.CSSProperties

  // 业务回调
  onRun?: (nodeIds?: string[]) => void
  onSave?: () => void
  onExport?: (format: 'json' | 'image') => void
  onImport?: (data: any) => void
}

export interface WorkflowCanvasControlsProps {
  onRun?: () => void
  onSave?: () => void
  onExport?: (format: 'json' | 'image') => void
  onImport?: (data: any) => void
  onFitView?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onResetView?: () => void
  className?: string
}

export interface WorkflowContextMenuProps {
  position: { x: number; y: number }
  onClose: () => void
  onAddNode?: (type: string, position: { x: number; y: number }) => void
  onDeleteSelected?: () => void
  onCopySelected?: () => void
  onPaste?: () => void
  className?: string
}

export interface WorkflowNodeSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectNodeType: (type: string) => void
  position?: { x: number; y: number }
  className?: string
}

export interface WorkflowToolbarProps {
  onAddNode?: (type: string) => void
  onRun?: () => void
  onSave?: () => void
  onExport?: (format: 'json' | 'image') => void
  className?: string
}

export interface WorkflowMinimapProps {
  className?: string
}

export interface WorkflowSidebarProps {
  isOpen: boolean
  onClose: () => void
  onNodeTypeSelect?: (type: string) => void
  className?: string
}

export interface WorkflowCanvasState {
  nodes: Node[]
  edges: Edge[]
  selectedNodes: string[]
  selectedEdges: string[]
  viewport: Viewport
  isRunning: boolean
  isSaving: boolean
}

export type WorkflowNodeType = {
  id: string
  title: string
  description?: string
  category: string
  icon?: React.ReactNode
  color?: string
}

export type WorkflowAction =
  | { type: 'ADD_NODE'; payload: Node }
  | { type: 'REMOVE_NODE'; payload: string }
  | { type: 'UPDATE_NODE'; payload: { id: string; updates: Partial<Node> } }
  | { type: 'ADD_EDGE'; payload: Edge }
  | { type: 'REMOVE_EDGE'; payload: string }
  | { type: 'UPDATE_EDGE'; payload: { id: string; updates: Partial<Edge> } }
  | { type: 'SET_SELECTED_NODES'; payload: string[] }
  | { type: 'SET_SELECTED_EDGES'; payload: string[] }
  | { type: 'SET_VIEWPORT'; payload: Viewport }
  | { type: 'SET_IS_RUNNING'; payload: boolean }
  | { type: 'SET_IS_SAVING'; payload: boolean }