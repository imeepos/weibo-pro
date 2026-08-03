import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { WorkflowGraphAst } from '@sker/workflow'
import { useNodesState, useEdgesState } from '@xyflow/react'
import type { WorkflowNode, WorkflowEdge } from '../../types'
import { astToFlowNodes, astToFlowEdges } from '../../adapters/ast-to-flow'
import { StateChangeProxy } from '../../core/state-change-proxy'
import { historyManager } from '../../store/history.store'
import { useWorkflowStore } from '../../store/workflow.store'
import type { WorkflowContext } from './types'

/**
 * 工作流核心状态 Hook
 *
 * 单一数据源：workflowAst 为唯一真源，React Flow 的 nodes/edges 为派生状态。
 * 该 Hook 只负责状态创建与基础能力（同步、历史记录、变更代理），
 * 具体的节点/边/分组/布局操作由各 action Hook 组合。
 */
export function useWorkflowState(
  initialAst?: WorkflowGraphAst,
  onWorkflowChange?: () => void
): WorkflowContext {
  // 使用 ref 存储回调，避免 useEffect 依赖项不断变化
  const onWorkflowChangeRef = useRef(onWorkflowChange)

  // 更新 ref
  useEffect(() => {
    onWorkflowChangeRef.current = onWorkflowChange
  }, [onWorkflowChange])

  const [workflowAst, setWorkflowAst] = useState<WorkflowGraphAst>(() => {
    if (initialAst) return initialAst

    const ast = new WorkflowGraphAst()
    ast.name = 'New Workflow'
    ast.state = 'pending'
    return ast
  })

  const initialNodes = useMemo(() => astToFlowNodes(workflowAst), [])
  const initialEdges = useMemo(() => astToFlowEdges(workflowAst), [])

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  /**
   * 包装 onNodesChange，处理 dimensions 变更时的只读属性问题
   *
   * React Flow 的 applyNodeChanges 会直接修改节点对象的 width/height，
   * 如果节点对象是只读的（如来自 immer 或 Object.freeze），会抛出错误。
   * 这里手动处理 dimensions 变更，确保创建新对象而非修改原对象。
   */
  const onNodesChange = useCallback((changes: any[]) => {
    const dimensionChanges = changes.filter((c: any) => c.type === 'dimensions')
    const otherChanges = changes.filter((c: any) => c.type !== 'dimensions')

    // 先应用非 dimensions 变更（包括 add、remove、position 等）
    if (otherChanges.length > 0) {
      onNodesChangeInternal(otherChanges)
    }

    // 手动应用 dimensions 变更，创建新对象
    // 注意：必须在 otherChanges 之后处理，确保节点已存在
    if (dimensionChanges.length > 0) {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          const change = dimensionChanges.find((c: any) => c.id === node.id)
          if (change && change.dimensions) {
            return {
              ...node,
              width: change.dimensions.width,
              height: change.dimensions.height,
              measured: { width: change.dimensions.width, height: change.dimensions.height }
            }
          }
          return node
        })
      )
    }
  }, [onNodesChangeInternal, setNodes])

  // ✨ 集成 Zustand Store：同步状态到全局 store
  const storeSyncNodes = useWorkflowStore((state) => state.setNodes)
  const storeSyncEdges = useWorkflowStore((state) => state.setEdges)

  // 标记是否正在执行 undo/redo，避免重复记录历史
  const isUndoRedoRef = useRef(false)

  // 防抖定时器
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 标记是否已完成初始化（用于防止初始测量覆盖保存的尺寸）
  const isInitializedRef = useRef(false)

  // 标志位：防止 store 同步循环
  const isSyncingFromStoreRef = useRef(false)

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

  /**
   * 从 AST 同步到 React Flow 和 Zustand Store
   */
  const syncFromAst = useCallback(() => {
    const flowNodes = astToFlowNodes(workflowAst)
    const flowEdges = astToFlowEdges(workflowAst)
    setNodes(flowNodes)
    setEdges(flowEdges)
    // 同步到全局 store
    storeSyncNodes(flowNodes, false)
    storeSyncEdges(flowEdges, false)
  }, [workflowAst, setNodes, setEdges, storeSyncNodes, storeSyncEdges])

  return {
    workflowAst,
    setWorkflowAst,
    nodes,
    setNodes,
    edges,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onWorkflowChangeRef,
    isUndoRedoRef,
    isInitializedRef,
    isSyncingFromStoreRef,
    storeSyncNodes,
    storeSyncEdges,
    syncFromAst,
    recordHistory,
    changeProxy,
  }
}
