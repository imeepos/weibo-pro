import type { WorkflowGraphAst } from '@sker/workflow'
import { useWorkflowState } from './use-workflow/useWorkflowState'
import { useStoreSyncInit } from './use-workflow/useStoreSyncInit'
import { useStoreSyncPush } from './use-workflow/useStoreSyncPush'
import { useHistoryActions } from './use-workflow/useHistoryActions'
import { useNodeActions } from './use-workflow/useNodeActions'
import { useEdgeActions } from './use-workflow/useEdgeActions'
import { useWorkflowActions } from './use-workflow/useWorkflowActions'
import { useGroupActions } from './use-workflow/useGroupActions'
import { useEntryEndActions } from './use-workflow/useEntryEndActions'
import { useLayoutAction } from './use-workflow/useLayoutAction'
import type { UseWorkflowReturn, UseWorkflowOptions } from './use-workflow/types'

export type { UseWorkflowReturn } from './use-workflow/types'

/**
 * 工作流状态管理 Hook
 *
 * 单一数据源：所有操作都同步到 WorkflowGraphAst
 * - 添加节点 → workflowAst.addNode()
 * - 删除节点 → 从 workflowAst.nodes 移除
 * - 修改节点 → 更新 workflowAst.nodes 中的节点
 * - 连接节点 → workflowAst.addEdge()
 * - 删除连接 → 从 workflowAst.edges 移除
 *
 * 该文件仅负责组合各子模块，具体逻辑拆分到 use-workflow/ 目录。
 */
export function useWorkflow(
  initialAst?: WorkflowGraphAst,
  options?: UseWorkflowOptions
): UseWorkflowReturn {
  const { onWorkflowChange } = options || {}

  // 核心状态（workflowAst / nodes / edges / refs / syncFromAst / recordHistory / changeProxy）
  const state = useWorkflowState(initialAst, onWorkflowChange)

  // Store → 本地同步（初始化 store、订阅运行时状态）
  useStoreSyncInit(state)

  // 历史记录状态（canUndo/canRedo）与撤销/重做
  const { undo, redo, canUndo, canRedo } = useHistoryActions(state)

  // 本地 → Store 同步（AST 回写 + 推送 nodes/edges 到 store）
  useStoreSyncPush(state)

  // 节点操作
  const { addNode, removeNode, updateNode } = useNodeActions(state)

  // 边操作
  const { connectNodes, removeEdge } = useEdgeActions(state)

  // 工作流级操作
  const { clearWorkflow, replaceWorkflow } = useWorkflowActions(state)

  // 分组操作
  const { createGroup, ungroupNodes, toggleGroupCollapse, collapseNodes, expandNodes } = useGroupActions(state)

  // 起始/结束节点控制
  const { toggleEntryNode, toggleEndNode, isEntryNode, isEndNode } = useEntryEndActions(state)

  // 自动布局
  const { autoLayout } = useLayoutAction(state)

  return {
    workflowAst: state.workflowAst,
    nodes: state.nodes,
    edges: state.edges,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    addNode,
    removeNode,
    updateNode,
    connectNodes,
    removeEdge,
    clearWorkflow,
    replaceWorkflow,
    syncFromAst: state.syncFromAst,
    createGroup,
    ungroupNodes,
    toggleGroupCollapse,
    collapseNodes,
    expandNodes,
    autoLayout,
    // 起始/结束节点控制
    toggleEntryNode,
    toggleEndNode,
    isEntryNode,
    isEndNode,
    // 历史记录功能
    undo,
    redo,
    canUndo,
    canRedo,
    // 导出 StateChangeProxy，供高级用法使用
    changeProxy: state.changeProxy,
  }
}
