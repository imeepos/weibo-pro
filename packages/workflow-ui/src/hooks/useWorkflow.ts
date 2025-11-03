import { useState, useCallback, useMemo, useRef } from 'react'
import { WorkflowGraphAst, generateId } from '@sker/workflow'
import type { INode, IEdge } from '@sker/workflow'
import { useNodesState, useEdgesState, addEdge, type Connection } from '@xyflow/react'
import type { WorkflowNode, WorkflowEdge } from '../types'
import { astToFlowNodes, astToFlowEdges } from '../adapters/ast-to-flow'

export interface UseWorkflowReturn {
  workflowAst: WorkflowGraphAst
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  setNodes: (nodes: WorkflowNode[] | ((nodes: WorkflowNode[]) => WorkflowNode[])) => void
  setEdges: (edges: WorkflowEdge[] | ((edges: WorkflowEdge[]) => WorkflowEdge[])) => void
  onNodesChange: (changes: any) => void
  onEdgesChange: (changes: any) => void
  addNode: (nodeClass: any, position: { x: number; y: number }, label?: string) => void
  removeNode: (nodeId: string) => void
  updateNode: (nodeId: string, updates: Partial<INode>) => void
  connectNodes: (connection: Connection) => void
  removeEdge: (edgeId: string) => void
  clearWorkflow: () => void
  syncFromAst: () => void
}

/**
 * 工作流状态管理 Hook
 *
 * 单一数据源：所有操作都同步到 WorkflowGraphAst
 * - 添加节点 → workflowAst.addNode()
 * - 删除节点 → 从 workflowAst.nodes 移除
 * - 修改节点 → 更新 workflowAst.nodes 中的节点
 * - 连接节点 → workflowAst.addEdge()
 * - 删除连接 → 从 workflowAst.edges 移除
 */
export function useWorkflow(initialAst?: WorkflowGraphAst): UseWorkflowReturn {
  const [workflowAst] = useState<WorkflowGraphAst>(() => {
    if (initialAst) return initialAst

    const ast = new WorkflowGraphAst()
    ast.setName('New Workflow')
    ast.state = 'pending'
    return ast
  })

  const initialNodes = useMemo(() => astToFlowNodes(workflowAst), [])
  const initialEdges = useMemo(() => astToFlowEdges(workflowAst), [])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // 存储节点位置的映射，避免重复更新
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  /**
   * 从 AST 同步到 React Flow
   */
  const syncFromAst = useCallback(() => {
    const flowNodes = astToFlowNodes(workflowAst)
    const flowEdges = astToFlowEdges(workflowAst)
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [workflowAst, setNodes, setEdges])

  /**
   * 添加节点
   */
  const addNode = useCallback(
    (nodeClass: any, position: { x: number; y: number }, label?: string) => {
      const ast = new nodeClass()
      ast.id = generateId()

      workflowAst.addNode(ast)

      const node: WorkflowNode = {
        id: ast.id,
        type: 'workflow-node',
        position,
        data: {
          ast,
          nodeClass,
          label: label || nodeClass.name,
          state: ast.state || 'pending',
        },
      }

      setNodes((nodes) => [...nodes, node])
    },
    [workflowAst, setNodes]
  )

  /**
   * 删除节点
   */
  const removeNode = useCallback(
    (nodeId: string) => {
      workflowAst.nodes = workflowAst.nodes.filter((node) => node.id !== nodeId)
      workflowAst.edges = workflowAst.edges.filter(
        (edge) => edge.from !== nodeId && edge.to !== nodeId
      )

      setNodes((nodes) => nodes.filter((node) => node.id !== nodeId))
      setEdges((edges) =>
        edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      )
    },
    [workflowAst, setNodes, setEdges]
  )

  /**
   * 更新节点
   */
  const updateNode = useCallback(
    (nodeId: string, updates: Partial<INode>) => {
      const astNode = workflowAst.nodes.find((node) => node.id === nodeId)
      if (astNode) {
        Object.assign(astNode, updates)
      }

      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ast: { ...node.data.ast, ...updates },
                  state: updates.state || node.data.state,
                },
              }
            : node
        )
      )
    },
    [workflowAst, setNodes]
  )

  /**
   * 连接节点
   */
  const connectNodes = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return

      const edge: IEdge = {
        from: connection.source,
        to: connection.target,
        fromProperty: connection.sourceHandle || undefined,
        toProperty: connection.targetHandle || undefined,
      }

      workflowAst.addEdge(edge)

      const flowEdge: WorkflowEdge = {
        id: `edge-${generateId()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'workflow-data-edge',
        data: {
          edgeType: 'data',
          edge,
        },
      }

      setEdges((edges) => addEdge(flowEdge, edges))
    },
    [workflowAst, setEdges]
  )

  /**
   * 删除连接
   */
  const removeEdge = useCallback(
    (edgeId: string) => {
      const edgeIndex = edges.findIndex((edge) => edge.id === edgeId)
      if (edgeIndex === -1) return

      const edge = edges[edgeIndex]
      if (!edge) return

      const astEdgeIndex = workflowAst.edges.findIndex((e) => {
        const isDataEdge = 'fromProperty' in e && 'toProperty' in e
        if (!isDataEdge) return false

        return (
          e.from === edge.source &&
          e.to === edge.target &&
          (e as any).fromProperty === edge.sourceHandle &&
          (e as any).toProperty === edge.targetHandle
        )
      })

      if (astEdgeIndex !== -1) {
        workflowAst.edges.splice(astEdgeIndex, 1)
      }

      setEdges((edges) => edges.filter((e) => e.id !== edgeId))
    },
    [workflowAst, edges, setEdges]
  )

  /**
   * 清空工作流
   */
  const clearWorkflow = useCallback(() => {
    workflowAst.nodes = []
    workflowAst.edges = []
    setNodes([])
    setEdges([])
  }, [workflowAst, setNodes, setEdges])

  return {
    workflowAst,
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    addNode,
    removeNode,
    updateNode,
    connectNodes,
    removeEdge,
    clearWorkflow,
    syncFromAst,
  }
}
