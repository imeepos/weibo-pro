import type { Node } from '@xyflow/react'

export interface WorkflowNodeData {
  label?: string
  type: string
  status?: 'idle' | 'running' | 'success' | 'error'
  progress?: number
  [key: string]: any
}

export interface WorkflowNodeProps {
  id: string
  type: string
  data: WorkflowNodeData
  selected?: boolean
  className?: string
}

export interface WorkflowEdgeData {
  label?: string
  type?: string
  [key: string]: any
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
  category: string
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

export const DEFAULT_NODE_TYPES: Record<string, WorkflowNodeDefinition> = {
  start: {
    id: 'start',
    name: '开始节点',
    description: '工作流的起始节点',
    category: 'basic',
    color: '#10b981',
    outputs: [
      { id: 'output', name: '输出', type: 'any' }
    ]
  },
  end: {
    id: 'end',
    name: '结束节点',
    description: '工作流的结束节点',
    category: 'basic',
    color: '#ef4444',
    inputs: [
      { id: 'input', name: '输入', type: 'any' }
    ]
  },
  process: {
    id: 'process',
    name: '处理节点',
    description: '数据处理节点',
    category: 'basic',
    color: '#3b82f6',
    inputs: [
      { id: 'input', name: '输入', type: 'any' }
    ],
    outputs: [
      { id: 'output', name: '输出', type: 'any' }
    ]
  }
}

export const NODE_CATEGORIES: WorkflowNodeCategory[] = [
  {
    id: 'basic',
    name: '基础节点',
    description: '基础工作流节点',
    color: '#6b7280'
  },
  {
    id: 'data',
    name: '数据处理',
    description: '数据转换和处理节点',
    color: '#3b82f6'
  },
  {
    id: 'logic',
    name: '逻辑控制',
    description: '条件判断和流程控制节点',
    color: '#8b5cf6'
  },
  {
    id: 'api',
    name: 'API调用',
    description: '外部服务调用节点',
    color: '#10b981'
  }
]