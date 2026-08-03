import type { INode, WorkflowGraphAst } from '@sker/workflow'

/**
 * WorkflowCanvas 命令式 API 接口
 * 通过 ref 暴露给外部的方法
 */
export interface WorkflowCanvasRef {
  // 文件操作
  importWorkflow: (json: string) => Promise<void>
  exportWorkflow: () => string

  // 执行控制
  runWorkflow: () => Promise<void>
  cancelWorkflow: () => void
  runNode: (nodeId: string) => Promise<void>
  runNodeIsolated: (nodeId: string) => Promise<void>

  // 视图操作
  autoLayout: (direction?: 'TB' | 'LR') => void
  fitView: () => void
  zoomIn: () => void
  zoomOut: () => void
  centerView: () => void
  locateNode: (nodeId: string) => void

  // 节点操作
  selectAll: () => void
  deleteSelection: () => void
  copyNodes: () => void
  pasteNodes: () => void

  // 数据访问
  getWorkflowAst: () => WorkflowGraphAst
  getSelectedNodes: () => INode[]
}

export interface WorkflowCanvasProps {
  /** 工作流 AST 实例 */
  workflowAst?: INode
  /** 是否显示小地图 */
  showMiniMap?: boolean
  /** 是否显示控制面板 */
  showControls?: boolean
  /** 是否使用水平菜单栏（默认 false 使用垂直按钮组） */
  useMenubar?: boolean
  /** 是否显示背景 */
  showBackground?: boolean
  /** 是否启用网格吸附 */
  snapToGrid?: boolean
  /** 自定义类名 */
  className?: string
  /** 顶部标题 */
  title?: string
  /** 名称 */
  name?: string
  /** 运行全部节点回调 */
  onRunAll?: () => void
  /** 保存工作流回调 */
  onSave?: () => void
  /** 分享工作流回调 */
  onShare?: () => void
}
