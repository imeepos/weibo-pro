import type { Node, Edge, NodeProps as FlowNodeProps } from '@xyflow/react'
import type { Ast, IAstStates, IDataEdge, IControlEdge, INode } from '@sker/workflow'
import { Type } from '@sker/core'

/**
 * React Flow 节点数据结构
 */
export interface WorkflowNodeData extends Record<string, unknown> {
  /** 节点实例 */
  ast: Ast
  /** 节点类型构造器 */
  nodeClass: Type<any>;
  /** 节点显示标签 */
  label: string
  /** 当前执行状态 */
  state: IAstStates
  /** 错误信息 */
  error?: Error
}

/**
 * React Flow 节点类型
 */
export type WorkflowNode = Node<INode, string>

/**
 * React Flow 边数据结构
 */
export interface WorkflowEdgeData extends Record<string, unknown> {
  /** 边类型：数据边或控制边 */
  edgeType: 'data' | 'control'
  /** 原始边定义 */
  edge: IDataEdge | IControlEdge
  /** 数据边属性路径 */
  fromProperty?: string
  toProperty?: string
  /** 控制边条件 */
  condition?: {
    property: string
    value: any
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
  /** 节点自定义标题（用于显示中文） */
  title?: string
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
  /** 是否多输入汇聚 */
  isMulti?: boolean
  /** 显示标签 */
  label?: string
  /** 端口自定义标题（用于显示中文） */
  title?: string
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

/**
 * 节点组件 Props
 */
export type WorkflowNodeProps = FlowNodeProps<WorkflowNode>
