import type { Node, Edge, NodeProps as FlowNodeProps } from '@xyflow/react'
import type { IEdge, INode } from '@sker/workflow'

/**
 * React Flow 节点类型
 *
 * 优雅设计：
 * - 支持动态节点类型，每个 AST 类都可以有自己的渲染器
 * - type 属性与 AST 实例的 type 属性对应
 * - 使用泛型提供类型安全的节点数据访问
 */
export type WorkflowNode<T extends INode = INode> = Node<T & { collapsed?: boolean }, string>

/**
 * React Flow 边数据结构
 */
export interface WorkflowEdgeData extends Record<string, unknown> {
  /** 边类型：数据边或控制边 */
  edgeType: 'data' | 'control'
  /** AST 边对象引用 */
  edge?: IEdge
  /** 视觉样式类型 */
  styleType?: keyof typeof import('./edge.types').EDGE_TYPE_STYLES
  /** 数据边属性路径 */
  fromProperty?: string
  toProperty?: string
  /** 控制边条件 */
  condition?: {
    property: string
    value: unknown
  }
  /** 多输入权重 */
  weight?: number
}

/**
 * React Flow 边类型
 */
export type WorkflowEdge = Edge<WorkflowEdgeData>

/**
 * 节点元数据
 */
export interface NodeMetadata {
  /** 节点类型名称 */
  type: string
  /** 节点显示标签 */
  label: string
  /** 节点原始标题（装饰器定义的中文标题） */
  title?: string
  /** 节点分类类型 */
  nodeType?: 'llm' | 'basic' | 'crawler' | `control` | 'sentiment'
  /** 输入端口定义 */
  inputs: PortMetadata[]
  /** 输出端口定义 */
  outputs: PortMetadata[]
}

/**
 * 端口元数据
 */
export interface PortMetadata {
  /** 属性名 */
  property: string
  /** 属性类型 */
  type: string
  /** @deprecated 使用 mode 替代 */
  isMulti?: boolean
  /** 聚合模式位标志 (IS_MULTI | IS_BUFFER) */
  mode?: number
  /** 显示标签 */
  label?: string
  /** 端口当前值（用于显示数量） */
  value?: any
}

/**
 * 工作流画布状态
 */
export interface WorkflowCanvasState {
  /** React Flow 节点列表 */
  nodes: WorkflowNode[]
  /** React Flow 边列表 */
  edges: WorkflowEdge[]
  /** 是否正在执行 */
  isExecuting: boolean
  /** 执行错误 */
  executionError?: Error
}
