import { useState, useCallback, useMemo, useEffect } from 'react'
import { WorkflowGraphAst, generateId } from '@sker/workflow'
import type { INode, IEdge } from '@sker/workflow'
import { useNodesState, useEdgesState, addEdge, type Connection } from '@xyflow/react'
import type { WorkflowNode, WorkflowEdge } from '../types'
import { astToFlowNodes, astToFlowEdges } from '../adapters/ast-to-flow'
import { getNodeMetadata } from '../adapters/metadata'
import { StateChangeProxy } from '../core/state-change-proxy'

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
  removeEdge: (edgeOrId: string | WorkflowEdge) => void
  clearWorkflow: () => void
  syncFromAst: () => void
  changeProxy: any
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

  // 创建 StateChangeProxy 实例，用于管理 AST 与 React Flow 的同步
  // 优雅设计：变更拦截器自动同步，批量更新优化性能
  const changeProxy = useMemo(
    () => new StateChangeProxy(setNodes, { debug: false, throttleDelay: 50 }),
    [setNodes]
  )

  // 监听节点位置变化，同步到 AST
  // 优雅设计：
  // - 细粒度同步，仅更新位置属性
  // - 引用透明性，React Flow 节点 data 直接引用 AST 实例
  // - 类型安全，无需 any 断言
  // - 节流优化：拖拽时使用节流版本，避免过度渲染
  useEffect(() => {
    nodes.forEach((node) => {
      const astNode = workflowAst.nodes.find((n) => n.id === node.id)
      if (astNode) {
        const currentPos = astNode.position
        const newPos = node.position

        // 只有位置真正改变时才更新
        if (!currentPos || currentPos.x !== newPos.x || currentPos.y !== newPos.y) {
          astNode.position = newPos
        }
      }
    })
  }, [nodes, workflowAst])

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
      console.log({ nodeClass, position, label })
      const ast = new nodeClass()
      ast.id = generateId()
      ast.position = position

      workflowAst.addNode(ast)

      const metadata = getNodeMetadata(nodeClass)
      const node: WorkflowNode = {
        id: ast.id,
        type: metadata.type,
        position,
        data: ast
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
                  state: updates.state || node.data.state
                }
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
        id: `edge-${generateId()}`,
        type: 'data',
        from: connection.source,
        to: connection.target,
        fromProperty: connection.sourceHandle || undefined,
        toProperty: connection.targetHandle || undefined
      }

      workflowAst.addEdge(edge)

      const flowEdge: WorkflowEdge = {
        id: edge.id,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'workflow-data-edge',
        data: {
          edgeType: 'data',
          edge
        }
      }

      setEdges((edges) => addEdge(flowEdge, edges))
    },
    [workflowAst, setEdges]
  )

  /**
   * 删除连接
   *
   * 优雅设计：
   * - 支持通过 edgeId 或完整 edge 对象删除
   * - 自动同步 AST 和 UI 状态
   * - 健壮的边匹配逻辑
   */
  const removeEdge = useCallback(
    (edgeOrId: string | WorkflowEdge) => {
      // 支持传入 edge.id 或完整的 edge 对象
      const edge =
        typeof edgeOrId === 'string'
          ? edges.find((e) => e.id === edgeOrId)
          : edgeOrId

      if (!edge) {
        console.warn('Edge not found:', edgeOrId)
        return
      }

      // 从 AST 中删除对应的边
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
        console.log(
          'Edge removed from AST:',
          edge.id,
          'AST edges count:',
          workflowAst.edges.length
        )
      } else {
        console.warn('Edge not found in AST:', edge)
      }

      // 更新 UI 状态
      setEdges((currentEdges) => currentEdges.filter((e) => e.id !== edge.id))
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
    // 导出 StateChangeProxy，供高级用法使用
    changeProxy
  }
}
