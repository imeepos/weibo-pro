import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { WorkflowGraphAst, INode } from '@sker/workflow'
import type { Connection } from '@xyflow/react'
import type { WorkflowNode, WorkflowEdge } from '../../types'
import type { StateChangeProxy } from '../../core/state-change-proxy'

/** React Flow 节点 setter 类型（与 useNodesState 返回值兼容） */
export type NodeSetter = (
  nodes: WorkflowNode[] | ((nodes: WorkflowNode[]) => WorkflowNode[])
) => void

/** React Flow 边 setter 类型（与 useEdgesState 返回值兼容） */
export type EdgeSetter = (
  edges: WorkflowEdge[] | ((edges: WorkflowEdge[]) => WorkflowEdge[])
) => void

/**
 * useWorkflow 返回值类型
 *
 * 保持公开 API 完全兼容：所有字段与拆分前一致。
 */
export interface UseWorkflowReturn {
  workflowAst: WorkflowGraphAst
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  setNodes: (nodes: WorkflowNode[] | ((nodes: WorkflowNode[]) => WorkflowNode[])) => void
  setEdges: (edges: WorkflowEdge[] | ((edges: WorkflowEdge[]) => WorkflowEdge[])) => void
  onNodesChange: (changes: any) => void
  onEdgesChange: (changes: any) => void
  addNode: (nodeClass: any, position: { x: number; y: number }, label?: string) => WorkflowNode
  removeNode: (nodeId: string) => void
  updateNode: (nodeId: string, updates: Partial<INode>) => void
  connectNodes: (connection: Connection) => void
  removeEdge: (edgeOrId: string | WorkflowEdge) => void
  clearWorkflow: () => void
  replaceWorkflow: (newWorkflowAst: WorkflowGraphAst) => void
  syncFromAst: () => void
  createGroup: (selectedNodeIds: string[], title?: string) => string | undefined
  ungroupNodes: (groupId: string) => void
  toggleGroupCollapse: (groupId: string) => void
  collapseNodes: (nodeIds?: string[]) => void
  expandNodes: (nodeIds?: string[]) => void
  autoLayout: () => void
  // 起始/结束节点控制
  toggleEntryNode: (nodeId: string) => void
  toggleEndNode: (nodeId: string) => void
  isEntryNode: (nodeId: string) => boolean
  isEndNode: (nodeId: string) => boolean
  // 历史记录功能
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  changeProxy: any
}

export interface UseWorkflowOptions {
  /** 工作流变更回调（用于自动保存等场景） */
  onWorkflowChange?: () => void
}

/**
 * 内部共享上下文
 *
 * 所有子 hooks 通过该上下文访问共享状态与基础能力，
 * 避免重复从 store 拉取数据，同时保证行为与拆分前一致。
 */
export interface WorkflowContext {
  workflowAst: WorkflowGraphAst
  setWorkflowAst: Dispatch<SetStateAction<WorkflowGraphAst>>
  nodes: WorkflowNode[]
  setNodes: NodeSetter
  edges: WorkflowEdge[]
  setEdges: EdgeSetter
  onNodesChange: (changes: any) => void
  onEdgesChange: (changes: any) => void
  onWorkflowChangeRef: MutableRefObject<(() => void) | undefined>
  isUndoRedoRef: MutableRefObject<boolean>
  isInitializedRef: MutableRefObject<boolean>
  isSyncingFromStoreRef: MutableRefObject<boolean>
  storeSyncNodes: (nodes: WorkflowNode[], recordHistory?: boolean) => void
  storeSyncEdges: (edges: WorkflowEdge[], recordHistory?: boolean) => void
  syncFromAst: () => void
  recordHistory: () => void
  changeProxy: StateChangeProxy
}
