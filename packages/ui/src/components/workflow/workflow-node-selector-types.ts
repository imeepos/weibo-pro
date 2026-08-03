'use client'

export type NodeType = 'llm' | 'basic' | 'crawler' | 'control' | 'sentiment' | 'analysis' | 'scheduler'

export interface NodeItem {
  type: string
  label: string
  nodeType?: NodeType
  inputs: any[]
  outputs: any[]
}

export interface WorkflowNodeSelectorProps {
  visible: boolean
  position: { x: number; y: number }
  nodes: NodeItem[]
  onSelect: (node: NodeItem) => void
  onClose: () => void
  className?: string
}
