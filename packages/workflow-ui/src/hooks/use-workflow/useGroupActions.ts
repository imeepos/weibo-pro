import { useCallback } from 'react'
import { generateId, getNodeById, addNode as astAddNode, Compiler, WorkflowGraphAst } from '@sker/workflow'
import { root } from '@sker/core'
import type { WorkflowContext } from './types'

/**
 * 分组操作 Hook
 *
 * 职责：创建分组、解散分组、切换折叠、批量折叠/展开。
 */
export function useGroupActions(ctx: WorkflowContext) {
  const { workflowAst, setNodes, syncFromAst, recordHistory } = ctx

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
   */
  const collapseNodes = useCallback((nodeIds?: string[]) => {
    const targetIds = new Set(nodeIds)

    // 更新 AST 节点（创建新对象避免只读属性问题）
    workflowAst.nodes = workflowAst.nodes.map(node => {
      const shouldCollapse = !nodeIds || targetIds.has(node.id)
      if (shouldCollapse && node.collapsed !== true) {
        return Object.assign(
          Object.create(Object.getPrototypeOf(node)),
          node,
          { collapsed: true }
        )
      }
      return node
    })

    // 更新 React Flow 节点
    setNodes(nodes =>
      nodes.map(node => {
        const shouldCollapse = !nodeIds || targetIds.has(node.id)
        if (shouldCollapse && node.data.collapsed !== true) {
          return { ...node, data: { ...node.data, collapsed: true } }
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
   */
  const expandNodes = useCallback((nodeIds?: string[]) => {
    const targetIds = new Set(nodeIds)

    // 更新 AST 节点（创建新对象避免只读属性问题）
    workflowAst.nodes = workflowAst.nodes.map(node => {
      const shouldExpand = !nodeIds || targetIds.has(node.id)
      if (shouldExpand && node.collapsed !== false) {
        return Object.assign(
          Object.create(Object.getPrototypeOf(node)),
          node,
          { collapsed: false }
        )
      }
      return node
    })

    // 更新 React Flow 节点
    setNodes(nodes =>
      nodes.map(node => {
        const shouldExpand = !nodeIds || targetIds.has(node.id)
        if (shouldExpand && node.data.collapsed !== false) {
          return { ...node, data: { ...node.data, collapsed: false } }
        }
        return node
      })
    )
  }, [setNodes, workflowAst])

  return { createGroup, ungroupNodes, toggleGroupCollapse, collapseNodes, expandNodes }
}
