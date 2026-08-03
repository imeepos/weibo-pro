import { useEffect } from 'react'
import type { INode } from '@sker/workflow'
import type { WorkflowContext } from './types'

/**
 * useWorkflow → Store 同步 Hook
 *
 * 职责：
 * 1. 将 React Flow 节点的位置/尺寸/@Input 属性变化回写到 AST（不可变方式）
 * 2. 将本地 nodes/edges 推送到全局 store
 */
export function useStoreSyncPush(ctx: WorkflowContext) {
  const {
    workflowAst,
    nodes,
    edges,
    storeSyncNodes,
    storeSyncEdges,
    onWorkflowChangeRef,
    isInitializedRef,
    isSyncingFromStoreRef,
  } = ctx

  useEffect(() => {
    // 如果正在从 store 同步，跳过此次更新（防止循环）
    if (isSyncingFromStoreRef.current) {
      return
    }

    const _hasPositionChanged = false

    // 递归更新 AST 节点（不可变方式）
    const updateAstNodes = (nodeList: INode[]): { nodes: INode[]; changed: boolean } => {
      let changed = false
      const updatedNodes = nodeList.map(astNode => {
        const flowNode = nodes.find(n => n.id === astNode.id)
        if (!flowNode) return astNode

        const updates: any = {}
        const currentPos = astNode.position
        const newPos = flowNode.position

        // 检查位置是否变化
        if (!currentPos || currentPos.x !== newPos.x || currentPos.y !== newPos.y) {
          updates.position = newPos
          changed = true
        }

        // 检查折叠状态
        if (astNode.collapsed !== flowNode.data.collapsed) {
          updates.collapsed = flowNode.data.collapsed
        }

        // 同步 GroupNode 的尺寸（仅在初始化完成后）
        if (isInitializedRef.current) {
          if (flowNode.width !== undefined && flowNode.width > 0 && astNode.width !== flowNode.width) {
            updates.width = flowNode.width
            changed = true
          }
          if (flowNode.height !== undefined && flowNode.height > 0 && astNode.height !== flowNode.height) {
            updates.height = flowNode.height
            changed = true
          }
        }

        // ✨ 同步所有 @Input 装饰的属性（支持渲染器组件更新数据）
        astNode.metadata?.inputs?.forEach((inputMeta: any) => {
          const key = String(inputMeta.property)
          const flowValue = flowNode.data[key]
          const astValue = astNode[key]

          // 只同步真正变化的值（避免触发不必要的更新）
          if (flowValue !== astValue && flowValue !== undefined) {
            updates[key] = flowValue
            changed = true
          }
        })

        // 如果有更新，创建新对象
        if (Object.keys(updates).length > 0) {
          const newNode = Object.assign(
            Object.create(Object.getPrototypeOf(astNode)),
            astNode,
            updates
          )

          // 递归更新子节点
          if ((astNode as any).isGroupNode && (astNode as any).nodes?.length > 0) {
            const result = updateAstNodes((astNode as any).nodes)
            if (result.changed) {
              newNode.nodes = result.nodes
              changed = true
            }
          }

          return newNode
        }

        // 即使没有直接更新，也要递归检查子节点
        if ((astNode as any).isGroupNode && (astNode as any).nodes?.length > 0) {
          const result = updateAstNodes((astNode as any).nodes)
          if (result.changed) {
            return Object.assign(
              Object.create(Object.getPrototypeOf(astNode)),
              astNode,
              { nodes: result.nodes }
            )
          }
        }

        return astNode
      })

      return { nodes: updatedNodes, changed }
    }

    const result = updateAstNodes(workflowAst.nodes)
    if (result.changed) {
      workflowAst.nodes = result.nodes
      // 触发自动保存（位置、尺寸、Input 属性变化都会触发）
      if (onWorkflowChangeRef.current) {
        onWorkflowChangeRef.current()
      }
    }

    // 同步 nodes 到全局 store
    storeSyncNodes(nodes, false)

    // 延迟标记初始化完成，跳过 React Flow 的初始测量
    if (!isInitializedRef.current) {
      setTimeout(() => {
        isInitializedRef.current = true
      }, 500)
    }
  }, [nodes, workflowAst, storeSyncNodes])

  // 同步 edges 到全局 store
  useEffect(() => {
    storeSyncEdges(edges, false)
  }, [edges, storeSyncEdges])
}
