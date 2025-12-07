import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { WorkflowGraphAst, generateId, addNode as astAddNode, addEdge as astAddEdge, Compiler, cleanOrphanedProperties, getNodeById } from '@sker/workflow'
import { root } from '@sker/core'
import type { INode, IEdge } from '@sker/workflow'
import { useNodesState, useEdgesState, addEdge, type Connection } from '@xyflow/react'
import type { WorkflowNode, WorkflowEdge } from '../types'
import { astToFlowNodes, astToFlowEdges } from '../adapters/ast-to-flow'
import { StateChangeProxy } from '../core/state-change-proxy'
import { calculateDagreLayout } from '../utils/layout'
import { historyManager } from '../store/history.store'

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
 * 工作流状态管理 Hook
 *
 * 单一数据源：所有操作都同步到 WorkflowGraphAst
 * - 添加节点 → workflowAst.addNode()
 * - 删除节点 → 从 workflowAst.nodes 移除
 * - 修改节点 → 更新 workflowAst.nodes 中的节点
 * - 连接节点 → workflowAst.addEdge()
 * - 删除连接 → 从 workflowAst.edges 移除
 */
export function useWorkflow(
  initialAst?: WorkflowGraphAst,
  options?: UseWorkflowOptions
): UseWorkflowReturn {
  const { onWorkflowChange } = options || {}

  // 使用 ref 存储回调，避免 useEffect 依赖项不断变化
  const onWorkflowChangeRef = useRef(onWorkflowChange)

  // 更新 ref
  useEffect(() => {
    onWorkflowChangeRef.current = onWorkflowChange
  }, [onWorkflowChange])

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

  // 历史记录状态
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // 标记是否正在执行 undo/redo，避免重复记录历史
  const isUndoRedoRef = useRef(false)

  // 防抖定时器
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 标记是否已完成初始化（用于防止初始测量覆盖保存的尺寸）
  const isInitializedRef = useRef(false)

  // 订阅历史记录状态
  useEffect(() => {
    const undoSub = historyManager.canUndo$.subscribe(setCanUndo)
    const redoSub = historyManager.canRedo$.subscribe(setCanRedo)

    return () => {
      undoSub.unsubscribe()
      redoSub.unsubscribe()
    }
  }, [])

  /**
   * 记录当前状态到历史
   * 使用防抖避免频繁记录
   */
  const recordHistory = useCallback(() => {
    // 如果正在执行 undo/redo，不记录历史
    if (isUndoRedoRef.current) return

    // 清除之前的定时器
    if (recordTimerRef.current) {
      clearTimeout(recordTimerRef.current)
    }

    // 延迟记录，合并快速连续的操作
    recordTimerRef.current = setTimeout(() => {
      historyManager.push(nodes, edges)
    }, 300)
  }, [nodes, edges])

  // 创建 StateChangeProxy 实例，用于管理 AST 与 React Flow 的同步
  // 优雅设计：变更拦截器自动同步，批量更新优化性能
  const changeProxy = useMemo(
    () => new StateChangeProxy(setNodes, { debug: false, throttleDelay: 50 }),
    [setNodes]
  )

  useEffect(() => {
    let hasPositionChanged = false

    // 递归查找 AST 节点
    const findAstNode = (id: string, nodeList: INode[]): INode | undefined => {
      for (const n of nodeList) {
        if (n.id === id) return n
        if ((n as any).isGroupNode && (n as any).nodes?.length > 0) {
          const found = findAstNode(id, (n as any).nodes)
          if (found) return found
        }
      }
      return undefined
    }

    nodes.forEach((node) => {
      const astNode = findAstNode(node.id, workflowAst.nodes)
      if (astNode) {
        const currentPos = astNode.position
        const newPos = node.position

        if (!currentPos || currentPos.x !== newPos.x || currentPos.y !== newPos.y) {
          astNode.position = newPos
          hasPositionChanged = true
        }

        if (astNode.collapsed !== node.data.collapsed) {
          astNode.collapsed = node.data.collapsed
        }

        // 同步 GroupNode 的尺寸（仅在初始化完成后）
        if (isInitializedRef.current) {
          if (node.width !== undefined && node.width > 0 && astNode.width !== node.width) {
            astNode.width = node.width
            hasPositionChanged = true
          }
          if (node.height !== undefined && node.height > 0 && astNode.height !== node.height) {
            astNode.height = node.height
            hasPositionChanged = true
          }
        }
      }
    })

    if (hasPositionChanged && onWorkflowChangeRef.current) {
      onWorkflowChangeRef.current()
    }

    // 延迟标记初始化完成，跳过 React Flow 的初始测量
    if (!isInitializedRef.current) {
      setTimeout(() => {
        isInitializedRef.current = true
      }, 500)
    }
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
      const ast = new nodeClass()
      ast.id = generateId()
      ast.position = position

      const compiler = root.get(Compiler)
      const compiledNode = compiler.compile(ast)

      workflowAst.nodes = astAddNode(workflowAst.nodes, compiledNode)

      const node: WorkflowNode = {
        id: compiledNode.id,
        type: compiledNode.type,
        position,
        data: compiledNode
      }

      setNodes((nodes) => [...nodes, node])
      onWorkflowChangeRef.current?.()
      recordHistory()

      return node
    },
    [workflowAst, setNodes, recordHistory]
  )

  /**
   * 删除节点
   *
   * 优雅设计：
   * - 同步删除关联的边
   * - 清理引用该节点的动态属性（避免属性残留）
   * - 同步更新 AST 和 UI 状态
   */
  const removeNode = useCallback(
    (nodeId: string) => {
      workflowAst.nodes = workflowAst.nodes.filter((node) => node.id !== nodeId)
      workflowAst.edges = workflowAst.edges.filter(
        (edge) => edge.from !== nodeId && edge.to !== nodeId
      )

      cleanOrphanedProperties(workflowAst, [nodeId])

      setNodes((nodes) => nodes.filter((node) => node.id !== nodeId))
      setEdges((edges) =>
        edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      )

      onWorkflowChangeRef.current?.()
      recordHistory()
    },
    [workflowAst, setNodes, setEdges, recordHistory]
  )

  /**
   * 更新节点
   *
   * ✨ 遵守不可变性原则：创建新对象而不是修改原对象
   */
  const updateNode = useCallback(
    (nodeId: string, updates: Partial<INode>) => {
      // ✨ 1. 找到 AST 节点并创建新对象（不可变）
      const astNodeIndex = workflowAst.nodes.findIndex(n => n.id === nodeId)
      if (astNodeIndex === -1) return

      const oldAstNode = workflowAst.nodes[astNodeIndex]

      // ✨ 创建新的 AST 节点对象（保持原型链）
      const newAstNode = Object.assign(
        Object.create(Object.getPrototypeOf(oldAstNode)),
        oldAstNode,
        updates
      )

      // ✨ 2. 替换 workflowAst.nodes 中的节点（不可变）
      workflowAst.nodes = [
        ...workflowAst.nodes.slice(0, astNodeIndex),
        newAstNode,
        ...workflowAst.nodes.slice(astNodeIndex + 1)
      ]

      // ✨ 3. 更新 React Flow 节点（不可变）
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            // 返回新的 node 对象，data 指向新的 AST 节点
            return {
              ...node,
              data: newAstNode
            }
          }
          return node
        })
      )

      // 触发变更回调
      onWorkflowChangeRef.current?.()
    },
    [workflowAst, setNodes]
  )

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

      // 查找节点所属的分组
      const findNodeParentGroup = (nodeId: string, nodes: INode[]): WorkflowGraphAst | null => {
        for (const node of nodes) {
          if ((node as any).isGroupNode && (node as any).nodes?.length > 0) {
            const group = node as WorkflowGraphAst
            if (group.nodes.some(n => n.id === nodeId)) {
              return group
            }
            const nested = findNodeParentGroup(nodeId, group.nodes)
            if (nested) return nested
          }
        }
        return null
      }

      const sourceGroup = findNodeParentGroup(connection.source, workflowAst.nodes)
      const targetGroup = findNodeParentGroup(connection.target, workflowAst.nodes)

      // 如果两个节点在同一分组内，边添加到分组的 edges
      if (sourceGroup && sourceGroup === targetGroup) {
        sourceGroup.edges = astAddEdge(sourceGroup.nodes, sourceGroup.edges, edge)
      } else {
        workflowAst.edges = astAddEdge(workflowAst.nodes, workflowAst.edges, edge)
      }

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
      onWorkflowChangeRef.current?.()
      recordHistory()
    },
    [workflowAst, setEdges, recordHistory]
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

      // ✨ 从 AST 中删除对应的边（不可变方式）
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
        // ✨ 创建新数组而不是修改原数组
        workflowAst.edges = [
          ...workflowAst.edges.slice(0, astEdgeIndex),
          ...workflowAst.edges.slice(astEdgeIndex + 1)
        ]
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

      // 触发变更回调
      onWorkflowChangeRef.current?.()
      recordHistory()
    },
    [workflowAst, edges, setEdges, recordHistory]
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
   * 创建分组（使用 React Flow parentId 机制）
   */
  const createGroup = useCallback(
    (selectedNodeIds: string[], title?: string): string | undefined => {
      if (selectedNodeIds.length === 0) return undefined

      const selectedNodes = workflowAst.nodes.filter(n => selectedNodeIds.includes(n.id))
      if (selectedNodes.length === 0) return undefined

      // 计算包围盒（考虑节点实际大小）
      const positions = selectedNodes.map(n => n.position).filter(Boolean)
      const padding = 20
      const headerHeight = 30
      const nodeWidth = 200
      const nodeHeight = 80

      const minX = Math.min(...positions.map(p => p.x)) - padding
      const minY = Math.min(...positions.map(p => p.y)) - padding - headerHeight
      const maxX = Math.max(...positions.map(p => p.x)) + nodeWidth + padding
      const maxY = Math.max(...positions.map(p => p.y)) + nodeHeight + padding

      // 创建分组节点
      const groupAst = new WorkflowGraphAst()
      groupAst.id = generateId()
      groupAst.name = title || `分组 ${workflowAst.nodes.filter(n => (n as any).isGroupNode === true).length + 1}`
      groupAst.color = '#3b82f6'
      groupAst.isGroupNode = true
      groupAst.position = { x: minX, y: minY }
      groupAst.width = maxX - minX
      groupAst.height = maxY - minY

      // 设置子节点的 parentId，并转换为相对坐标
      selectedNodes.forEach(node => {
        node.parentId = groupAst.id
        node.position = {
          x: node.position.x - minX,
          y: node.position.y - minY
        }
      })

      // 提取内部边移入分组
      const selectedNodeIdSet = new Set(selectedNodeIds)
      const internalEdges = workflowAst.edges.filter(
        e => selectedNodeIdSet.has(e.from) && selectedNodeIdSet.has(e.to)
      )
      groupAst.nodes = selectedNodes
      groupAst.edges = internalEdges

      // 编译分组节点，生成 metadata
      const compiler = root.get(Compiler)
      const compiledGroup = compiler.compile(groupAst)

      // 从父工作流移除
      workflowAst.nodes = workflowAst.nodes.filter(n => !selectedNodeIds.includes(n.id))
      workflowAst.edges = workflowAst.edges.filter(e => !internalEdges.some(ie => ie.id === e.id))
      workflowAst.nodes = astAddNode(workflowAst.nodes, compiledGroup)

      syncFromAst()
      recordHistory()
      return groupAst.id
    },
    [workflowAst, syncFromAst, recordHistory]
  )

  /**
   * 解散分组
   */
  const ungroupNodes = useCallback(
    (groupId: string) => {
      const groupNode = getNodeById(workflowAst.nodes, groupId) as WorkflowGraphAst | undefined
      if (!groupNode || groupNode.type !== 'WorkflowGraphAst') return

      const groupPos = groupNode.position

      // ✨ 创建新的节点对象（不可变方式）
      const updatedNodes = groupNode.nodes.map(node => {
        // 创建新的节点对象
        const newNode = Object.assign(
          Object.create(Object.getPrototypeOf(node)),
          node,
          {
            parentId: undefined,
            position: {
              x: node.position.x + groupPos.x,
              y: node.position.y + groupPos.y
            }
          }
        )
        return newNode
      })

      // ✨ 移回父工作流（不可变方式）
      workflowAst.nodes = [
        ...workflowAst.nodes.filter(n => n.id !== groupId),
        ...updatedNodes
      ]
      workflowAst.edges = [
        ...workflowAst.edges,
        ...groupNode.edges
      ]

      syncFromAst()
      recordHistory()
    },
    [workflowAst, syncFromAst, recordHistory]
  )

  /**
   * 切换分组折叠状态
   */
  const toggleGroupCollapse = useCallback(
    (groupId: string) => {
      const groupNode = getNodeById(workflowAst.nodes, groupId)

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
          const astNode = getNodeById(workflowAst.nodes, node.id)
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
          const astNode = getNodeById(workflowAst.nodes, node.id)
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
          const astNode = getNodeById(workflowAst.nodes, node.id)
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

    recordHistory()
  }, [nodes, edges, workflowAst, setNodes, recordHistory])

  /**
   * 撤销操作
   * 优雅设计：从历史管理器恢复快照，同步到画布和 AST
   */
  const undo = useCallback(() => {
    const snapshot = historyManager.undo()
    if (!snapshot) return

    isUndoRedoRef.current = true

    try {
      // 恢复 ReactFlow 状态
      setNodes(snapshot.nodes)
      setEdges(snapshot.edges)

      // 同步到 AST
      const flowNodes = astToFlowNodes(workflowAst)
      const nodeIdSet = new Set(snapshot.nodes.map(n => n.id))

      // 移除不在快照中的节点
      workflowAst.nodes = workflowAst.nodes.filter(n => nodeIdSet.has(n.id))

      // 更新节点位置和状态
      snapshot.nodes.forEach(flowNode => {
        const astNode = getNodeById(workflowAst.nodes, flowNode.id)
        if (astNode) {
          astNode.position = flowNode.position
          if (flowNode.data.collapsed !== undefined) {
            astNode.collapsed = flowNode.data.collapsed
          }
        }
      })

      // 同步边
      const edgeSet = new Set(
        snapshot.edges.map(e => `${e.source}-${e.sourceHandle}-${e.target}-${e.targetHandle}`)
      )
      workflowAst.edges = workflowAst.edges.filter(e =>
        edgeSet.has(`${e.from}-${e.fromProperty}-${e.to}-${e.toProperty}`)
      )
    } finally {
      isUndoRedoRef.current = false
    }
  }, [workflowAst, setNodes, setEdges])

  /**
   * 重做操作
   * 优雅设计：从历史管理器恢复快照，同步到画布和 AST
   */
  const redo = useCallback(() => {
    const snapshot = historyManager.redo()
    if (!snapshot) return

    isUndoRedoRef.current = true

    try {
      // 恢复 ReactFlow 状态
      setNodes(snapshot.nodes)
      setEdges(snapshot.edges)

      // 同步到 AST
      const nodeIdSet = new Set(snapshot.nodes.map(n => n.id))

      // 移除不在快照中的节点
      workflowAst.nodes = workflowAst.nodes.filter(n => nodeIdSet.has(n.id))

      // 更新节点位置和状态
      snapshot.nodes.forEach(flowNode => {
        const astNode = getNodeById(workflowAst.nodes, flowNode.id)
        if (astNode) {
          astNode.position = flowNode.position
          if (flowNode.data.collapsed !== undefined) {
            astNode.collapsed = flowNode.data.collapsed
          }
        }
      })

      // 同步边
      const edgeSet = new Set(
        snapshot.edges.map(e => `${e.source}-${e.sourceHandle}-${e.target}-${e.targetHandle}`)
      )
      workflowAst.edges = workflowAst.edges.filter(e =>
        edgeSet.has(`${e.from}-${e.fromProperty}-${e.to}-${e.toProperty}`)
      )
    } finally {
      isUndoRedoRef.current = false
    }
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
    createGroup,
    ungroupNodes,
    toggleGroupCollapse,
    collapseNodes,
    expandNodes,
    autoLayout,
    // 历史记录功能
    undo,
    redo,
    canUndo,
    canRedo,
    // 导出 StateChangeProxy，供高级用法使用
    changeProxy
  }
}
