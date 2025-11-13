// 导入渲染器（确保装饰器注册）
import './renderers'

// 导出样式
import './styles/globals.css'

export * from './core';

// 导出 ReactFlow 核心组件
export { ReactFlowProvider } from '@xyflow/react'

// 导出组件
export { WorkflowCanvas } from './components/WorkflowCanvas'
export type { WorkflowCanvasProps } from './components/WorkflowCanvas'

export { NodePalette } from './components/NodePalette'
export type { NodePaletteProps } from './components/NodePalette'

export { PropertyPanel } from './components/PropertyPanel'
export type { PropertyPanelProps } from './components/PropertyPanel'

export { BaseNode, createNodeTypes } from './components/nodes'
export { DataEdge, ControlEdge, edgeTypes } from './components/edges'

// 导出 Hooks
export { useWorkflow } from './hooks'
export type { UseWorkflowReturn } from './hooks'

// 导出 Stores
export {
  useWorkflowStore,
  useSelectionStore,
  useExecutionStore,
} from './store'

// 导出适配器
export {
  getNodeMetadata,
  getAllNodeTypes,
  astToFlow,
  flowToAst,
} from './adapters'

// 导出类型
export type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowEdgeData,
  WorkflowNodeProps,
  WorkflowCanvasState,
  NodeMetadata,
  PortMetadata,
  NodeHandleConfig,
  HandlePosition,
  HandleType,
  EdgeValidationResult,
  ConnectionParams,
} from './types'

export {
  NODE_STATE_COLORS,
  NODE_STATE_LABELS,
  EDGE_TYPE_STYLES,
} from './types'

// 导出工具函数
export { cn } from './utils/cn'

// 导出执行器系统
export {
  ExecutorManager,
  ExecutorFinder,
  initializeFrontendExecutors,
  getExecutorSystemStatus
} from './execution'

// 导出执行器组件
export { InlineExecutor, WeiboLoginExecutor } from './components/execution/InlineExecutor'
