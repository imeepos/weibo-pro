import { useCallback } from 'react'
import { generateId, addNode as astAddNode, cleanOrphanedProperties, Compiler } from '@sker/workflow'
import { root } from '@sker/core'
import type { INode } from '@sker/workflow'
import type { WorkflowNode } from '../../types'
import type { WorkflowContext } from './types'

/**
 * 节点操作 Hook
 *
 * 职责：添加节点、删除节点、更新节点，保持 AST 与 React Flow 同步。
 */
export function useNodeActions(ctx: WorkflowContext) {
  const { workflowAst, setNodes, setEdges, syncFromAst, recordHistory, onWorkflowChangeRef } = ctx

  /**
   * 添加节点
   *
   * 优雅设计：
   * - 创建 Ast 实例后，立即使用 Compiler 固化元数据
   * - 将装饰器元数据提取到 node.metadata 字段
   * - 保存后的 INode 自包含元数据，无需依赖装饰器
   */
  const addNode = useCallback(
    (nodeClass: any, position: { x: number; y: number }, _label?: string) => {
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

      // 清理 entryNodeIds 和 endNodeIds 中的孤立引用
      workflowAst.entryNodeIds = workflowAst.entryNodeIds.filter(id => id !== nodeId)
      workflowAst.endNodeIds = workflowAst.endNodeIds.filter(id => id !== nodeId)

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
   * 创建新节点对象替换旧节点，确保 React 检测到变化
   */
  const updateNode = useCallback(
    (nodeId: string, updates: Partial<INode>) => {
      // 递归查找并替换节点（不可变方式）
      const replaceNode = (nodes: INode[]): { nodes: INode[]; found: boolean } => {
        let found = false
        const newNodes = nodes.map(node => {
          if (node.id === nodeId) {
            found = true
            // 创建新对象，保持原型链
            return Object.assign(
              Object.create(Object.getPrototypeOf(node)),
              node,
              updates
            )
          }
          if ((node as any).isGroupNode && (node as any).nodes?.length > 0) {
            const result = replaceNode((node as any).nodes)
            if (result.found) {
              found = true
              return Object.assign(
                Object.create(Object.getPrototypeOf(node)),
                node,
                { nodes: result.nodes }
              )
            }
          }
          return node
        })
        return { nodes: newNodes, found }
      }

      const result = replaceNode(workflowAst.nodes)

      if (result.found) {
        workflowAst.nodes = result.nodes
        syncFromAst()
        onWorkflowChangeRef.current?.()
      }
    },
    [workflowAst, syncFromAst]
  )

  return { addNode, removeNode, updateNode }
}
