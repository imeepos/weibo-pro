import type { Position } from '@xyflow/react'
import { IEdge } from '../types'

// 工作流节点状态类型（本地定义，避免依赖 @sker/workflow）
export type IAstStates = 'pending' | 'running' | 'emitting' | 'success' | 'fail'

export interface WorkflowNodeHandle {
  id: string
  type: 'source' | 'target'
  position: Position
  label?: string
  isMulti?: boolean
}

export interface WorkflowNodePort {
  property: string
  label?: string
  /** @deprecated 使用 mode 替代 */
  isMulti?: boolean
  /** 聚合模式位标志 (IS_MULTI | IS_BUFFER) */
  mode?: number
  /** 端口当前值（用于显示数量） */
  value?: any
}

export interface WorkflowNodeProps {
  // 基础信息
  id: string
  type: string
  label: string
  description?: string
  color?: string
  icon?: React.ReactNode

  // 状态
  status?: IAstStates
  statusCount?: number

  // 端口
  inputs?: WorkflowNodePort[]
  outputs?: WorkflowNodePort[]

  // UI 状态
  selected?: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void

  // 自定义内容
  children?: React.ReactNode

  // 交互
  onContextMenu?: (e: React.MouseEvent) => void
  onDoubleClick?: (e: React.MouseEvent) => void

  className?: string
}

// 保留旧的接口以兼容现有代码
export interface WorkflowNodeData {
  label?: string
  type: string
  status?: IAstStates
  progress?: number
  [key: string]: any
}

export interface WorkflowEdgeData extends IEdge {
  edge: IEdge
}

export interface WorkflowEdgeProps {
  id: string
  source: string
  target: string
  data?: WorkflowEdgeData
  selected?: boolean
  className?: string
}

export interface WorkflowNodeCategory {
  id: string
  name: string
  description?: string
  color?: string
  icon?: React.ReactNode
}

export interface WorkflowNodeDefinition {
  id: string
  name: string
  description: string
  icon?: React.ReactNode
  color?: string
  inputs?: Array<{
    id: string
    name: string
    type: string
    required?: boolean
  }>
  outputs?: Array<{
    id: string
    name: string
    type: string
  }>
  defaultData?: Record<string, any>
}

