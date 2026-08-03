import { useCallback, useEffect, useState } from 'react'
import { historyManager } from '../../store/history.store'
import type { WorkflowContext } from './types'

/**
 * 历史记录（撤销/重做）Hook
 *
 * 职责：
 * - 订阅 historyManager 状态，维护 canUndo / canRedo
 * - 从历史管理器恢复快照，同步到 React Flow 画布和 AST
 */
export function useHistoryActions(ctx: WorkflowContext) {
  const { workflowAst, setNodes, setEdges, isUndoRedoRef } = ctx

  // 历史记录状态
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

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
      const nodeIdSet = new Set(snapshot.nodes.map(n => n.id))
      const positionMap = new Map(snapshot.nodes.map(n => [n.id, { position: n.position, collapsed: n.data.collapsed }]))

      // 更新 AST 节点（创建新对象避免只读属性问题）
      workflowAst.nodes = workflowAst.nodes
        .filter(n => nodeIdSet.has(n.id))
        .map(node => {
          const updates = positionMap.get(node.id)
          if (updates) {
            return Object.assign(
              Object.create(Object.getPrototypeOf(node)),
              node,
              { position: updates.position },
              updates.collapsed !== undefined ? { collapsed: updates.collapsed } : {}
            )
          }
          return node
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
      const positionMap = new Map(snapshot.nodes.map(n => [n.id, { position: n.position, collapsed: n.data.collapsed }]))

      // 更新 AST 节点（创建新对象避免只读属性问题）
      workflowAst.nodes = workflowAst.nodes
        .filter(n => nodeIdSet.has(n.id))
        .map(node => {
          const updates = positionMap.get(node.id)
          if (updates) {
            return Object.assign(
              Object.create(Object.getPrototypeOf(node)),
              node,
              { position: updates.position },
              updates.collapsed !== undefined ? { collapsed: updates.collapsed } : {}
            )
          }
          return node
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

  return { undo, redo, canUndo, canRedo }
}
