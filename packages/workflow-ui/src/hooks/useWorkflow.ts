import { useState, useCallback, useMemo, useEffect } from 'react'
import { WorkflowGraphAst, generateId, addNode as astAddNode, addEdge as astAddEdge, Compiler } from '@sker/workflow'
import { root } from '@sker/core'
import type { INode, IEdge } from '@sker/workflow'
import { useNodesState, useEdgesState, addEdge, type Connection } from '@xyflow/react'
import type { WorkflowNode, WorkflowEdge } from '../types'
import { astToFlowNodes, astToFlowEdges } from '../adapters/ast-to-flow'
import { getNodeMetadata } from '../adapters/metadata'
import { StateChangeProxy } from '../core/state-change-proxy'
import { calculateDagreLayout } from '../utils/layout'

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
  syncFromAst: () => void
  createGroup: (selectedNodeIds: string[], title?: string) => string | undefined
  ungroupNodes: (groupId: string) => void
  toggleGroupCollapse: (groupId: string) => void
  collapseNodes: (nodeIds?: string[]) => void
  expandNodes: (nodeIds?: string[]) => void
  autoLayout: () => void
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
    ast.name = 'New Workflow'
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
  // - 分组同步：当分组节点移动时，同步移动内部所有节点
  useEffect(() => {
    nodes.forEach((node) => {
      const astNode = workflowAst.nodes.find((n) => n.id === node.id)
      if (astNode) {
        const currentPos = astNode.position
        const newPos = node.position

        // 只有位置真正改变时才更新
        if (!currentPos || currentPos.x !== newPos.x || currentPos.y !== newPos.y) {
          const deltaX = newPos.x - (currentPos?.x || 0)
          const deltaY = newPos.y - (currentPos?.y || 0)

          astNode.position = newPos

          // 如果是分组节点，同步移动内部所有节点
          if (astNode instanceof WorkflowGraphAst && astNode.isGroup) {
            astNode.nodes.forEach(innerNode => {
              innerNode.position = {
                x: innerNode.position.x + deltaX,
                y: innerNode.position.y + deltaY
              }
            })
          }
        }

        // 同步折叠状态（保护 UI 状态）
        if (astNode.collapsed !== node.data.collapsed) {
          astNode.collapsed = node.data.collapsed
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
   *
   * 优雅设计：
   * - 创建 Ast 实例后，立即使用 Compiler 固化元数据
   * - 将装饰器元数据提取到 node.metadata 字段
   * - 保存后的 INode 自包含元数据，无需依赖装饰器
   */
  const addNode = useCallback(
    (nodeClass: any, position: { x: number; y: number }, label?: string) => {
      console.log({ nodeClass, position, label })

      // 1. 创建 Ast 实例
      const ast = new nodeClass()
      ast.id = generateId()
      ast.position = position

      // 2. 使用 Compiler 固化元数据（关键步骤）
      const compiler = root.get(Compiler)
      const compiledNode = compiler.compile(ast)

      // 3. 添加到工作流
      workflowAst.nodes = astAddNode(workflowAst.nodes, compiledNode)

      const metadata = getNodeMetadata(compiledNode)
      const node: WorkflowNode = {
        id: compiledNode.id,
        type: metadata.type,
        position,
        data: compiledNode  // 使用编译后的节点（包含 metadata）
      }

      setNodes((nodes) => [...nodes, node])

      // 返回创建的节点
      return node
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
   *
   * 优雅设计：保持 data 对象引用稳定，避免不必要的重新渲染
   * - 直接修改 AST 对象，保持引用不变
   * - 最小化 React Flow 节点对象更新
   */
  const updateNode = useCallback(
    (nodeId: string, updates: Partial<INode>) => {
      const astNode = workflowAst.nodes.find((node) => node.id === nodeId)
      if (astNode) {
        Object.assign(astNode, updates)
      }

      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            // 只在必要时更新 state，保持 data 引用稳定
            if (updates.state !== undefined && node.data.state !== updates.state) {
              return {
                ...node,
                data: node.data
              }
            }
            // 如果只有 AST 数据变化，保持整个 node 引用稳定
            return node
          }
          return node
        })
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

      workflowAst.edges = astAddEdge(workflowAst.nodes, workflowAst.edges, edge)

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
        // 检查是否有数据映射属性
        if (!e.fromProperty || !e.toProperty) return false

        return (
          e.from === edge.source &&
          e.to === edge.target &&
          e.fromProperty === edge.sourceHandle &&
          e.toProperty === edge.targetHandle
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

  /**
   * 创建分组
   *
   * 优雅设计：
   * - 将选中节点转换为分组容器（WorkflowGraphAst）
   * - 自动处理内部边和跨边界边
   * - 计算分组位置为选中节点包围盒中心
   * - 返回分组ID，便于后续操作
   */
  const createGroup = useCallback(
    (selectedNodeIds: string[], title?: string): string | undefined => {
      if (selectedNodeIds.length === 0) {
        console.warn('无选中节点，无法创建分组')
        return undefined
      }

      // 1. 创建分组 AST
      const groupAst = new WorkflowGraphAst()
      groupAst.id = generateId()
      groupAst.name = title || `分组 ${workflowAst.nodes.filter(n => n instanceof WorkflowGraphAst && n.isGroup).length + 1}`
      groupAst.color = '#3b82f6'
      groupAst.collapsed = true
      // 注意：不设置 entryNodeIds，保持为空数组，这样 isGroup getter 会返回 true

      // 2. 提取选中节点
      const selectedNodes = workflowAst.nodes.filter(n => selectedNodeIds.includes(n.id))
      if (selectedNodes.length === 0) {
        console.warn('未找到选中节点')
        return undefined
      }

      // 3. 计算分组位置（包围盒中心）
      const positions = selectedNodes.map(n => n.position).filter(p => p)
      if (positions.length > 0) {
        const minX = Math.min(...positions.map(p => p.x))
        const maxX = Math.max(...positions.map(p => p.x))
        const minY = Math.min(...positions.map(p => p.y))
        const maxY = Math.max(...positions.map(p => p.y))
        groupAst.position = {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2
        }
      }

      // 4. 提取内部边（两端都在选中节点内）
      const selectedNodeIdSet = new Set(selectedNodeIds)
      const internalEdges = workflowAst.edges.filter(
        e => selectedNodeIdSet.has(e.from) && selectedNodeIdSet.has(e.to)
      )

      // 5. 将节点和内部边移入分组
      groupAst.nodes = selectedNodes
      groupAst.edges = internalEdges

      // 6. 从父工作流移除节点和内部边
      workflowAst.nodes = workflowAst.nodes.filter(n => !selectedNodeIds.includes(n.id))
      workflowAst.edges = workflowAst.edges.filter(
        e => !internalEdges.some(ie => ie.id === e.id)
      )

      // 7. 将分组添加到父工作流
      workflowAst.nodes = astAddNode(workflowAst.nodes, groupAst)

      // 8. 处理跨边界边（一端在分组内，一端在外）
      // TODO: 未来实现边重定向逻辑

      // 9. 同步到 UI
      syncFromAst()

      return groupAst.id
    },
    [workflowAst, syncFromAst]
  )

  /**
   * 解散分组
   *
   * 优雅设计：
   * - 将分组内节点还原到父工作流
   * - 恢复内部边
   * - 删除分组节点
   */
  const ungroupNodes = useCallback(
    (groupId: string) => {
      const groupNode = workflowAst.nodes.find(n => n.id === groupId)

      if (groupNode && groupNode.type === 'WorkflowGraphAst') {
        // 1. 将分组内节点移回父工作流
        workflowAst.nodes = workflowAst.nodes.filter(n => n.id !== groupId)
        workflowAst.nodes.push(...groupNode.nodes)

        // 2. 将内部边移回父工作流
        workflowAst.edges.push(...groupNode.edges)

        // 3. 同步到 UI
        syncFromAst()
      }
    },
    [workflowAst, syncFromAst]
  )

  /**
   * 切换分组折叠状态
   */
  const toggleGroupCollapse = useCallback(
    (groupId: string) => {
      const groupNode = workflowAst.nodes.find(n => n.id === groupId)

      if (groupNode && groupNode.type === 'WorkflowGraphAst') {
        groupNode.collapsed = !groupNode.collapsed
        // 同步到 UI
        syncFromAst()
      }
    },
    [workflowAst, syncFromAst]
  )

  /**
   * 折叠节点（智能模式）
   *
   * - 有指定节点：仅折叠指定的节点
   * - 无指定节点：折叠所有节点
   *
   * 优雅设计：保持 data 对象引用稳定
   */
  const collapseNodes = useCallback((nodeIds?: string[]) => {
    setNodes(nodes =>
      nodes.map(node => {
        const shouldCollapse = !nodeIds || nodeIds.includes(node.id)
        if (shouldCollapse && node.data.collapsed !== true) {
          // 同步到 AST
          const astNode = workflowAst.nodes.find(n => n.id === node.id)
          if (astNode) {
            astNode.collapsed = true
          }
          // 直接修改 data 对象，保持引用稳定
          node.data.collapsed = true
        }
        return node
      })
    )
  }, [setNodes, workflowAst])

  /**
   * 展开节点（智能模式）
   *
   * - 有指定节点：仅展开指定的节点
   * - 无指定节点：展开所有节点
   *
   * 优雅设计：保持 data 对象引用稳定
   */
  const expandNodes = useCallback((nodeIds?: string[]) => {
    setNodes(nodes =>
      nodes.map(node => {
        const shouldExpand = !nodeIds || nodeIds.includes(node.id)
        if (shouldExpand && node.data.collapsed !== false) {
          // 同步到 AST
          const astNode = workflowAst.nodes.find(n => n.id === node.id)
          if (astNode) {
            astNode.collapsed = false
          }
          // 直接修改 data 对象，保持引用稳定
          node.data.collapsed = false
        }
        return node
      })
    )
  }, [setNodes, workflowAst])

  /**
   * 自动布局
   *
   * 使用 Dagre 算法重新排列节点，保持拓扑结构
   */
  const autoLayout = useCallback(() => {
    const positions = calculateDagreLayout(nodes, edges)

    setNodes(nodes =>
      nodes.map(node => {
        const newPosition = positions.get(node.id)
        if (newPosition) {
          // 同步到 AST
          const astNode = workflowAst.nodes.find(n => n.id === node.id)
          if (astNode) {
            astNode.position = newPosition
          }
          return {
            ...node,
            position: newPosition
          }
        }
        return node
      })
    )
  }, [nodes, edges, workflowAst, setNodes])

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
    createGroup,
    ungroupNodes,
    toggleGroupCollapse,
    collapseNodes,
    expandNodes,
    autoLayout,
    // 导出 StateChangeProxy，供高级用法使用
    changeProxy
  }
}
