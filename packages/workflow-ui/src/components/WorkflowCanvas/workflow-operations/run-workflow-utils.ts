import type { WorkflowGraphAst, INode } from '@sker/workflow'
import { root } from '@sker/core'
import { WorkflowController } from '@sker/sdk'

/**
 * 重置正在运行的节点为 pending，保留输出字段（不可变方式）。
 * 仅在节点 state === 'running' 时重置。
 */
export function resetRunningNodesToPending(nodes: INode[]): INode[] {
  return nodes.map(node => {
    if (node.state === 'running') {
      // 保留输出字段
      const outputFields: Record<string, any> = {}
      node.metadata?.outputs?.forEach((output: any) => {
        if (node[output.property] !== undefined) {
          outputFields[output.property] = node[output.property]
        }
      })

      return Object.assign(
        Object.create(Object.getPrototypeOf(node)),
        node,
        { state: 'pending', error: undefined, ...outputFields }
      )
    }
    return node
  })
}

/**
 * 重置所有节点为 pending，保留输出字段，并清零计数（不可变方式）。
 */
export function resetAllNodesToPending(nodes: INode[]): INode[] {
  return nodes.map(node => {
    // 保留输出字段（qrcode, account, message 等）
    const outputFields: Record<string, any> = {}
    node.metadata?.outputs?.forEach((output: any) => {
      if (node[output.property] !== undefined) {
        outputFields[output.property] = node[output.property]
      }
    })

    return Object.assign(
      Object.create(Object.getPrototypeOf(node)),
      node,
      {
        state: 'pending',
        count: 0,
        emitCount: 0,
        error: undefined,
        ...outputFields
      }
    )
  })
}

/**
 * 将输入参数（key 格式: "nodeId.propertyKey"）批量应用到对应节点。
 * 跳过 undefined 值（保留节点默认值）。
 */
export function applyInputsToNodes(ast: WorkflowGraphAst, inputs: Record<string, unknown>): void {
  console.log(`[runWorkflow] 接收到的 inputs:`, inputs)
  if (!inputs || Object.keys(inputs).length === 0) {
    return
  }

  // 收集所有需要修改的节点更新（批量优化）
  const nodeUpdates = new Map<string, Record<string, any>>()

  Object.entries(inputs).forEach(([key, value]) => {
    // 跳过 undefined 值（保留节点默认值）
    if (value === undefined) {
      return
    }

    const dotIndex = key.indexOf('.')
    if (dotIndex === -1) {
      console.warn(`⚠️ 无效的输入键格式: ${key}`)
      return
    }

    const nodeId = key.substring(0, dotIndex)
    const propertyKey = key.substring(dotIndex + 1)

    if (!nodeUpdates.has(nodeId)) {
      nodeUpdates.set(nodeId, {})
    }
    nodeUpdates.get(nodeId)![propertyKey] = value
  })

  // 批量更新节点（不可变方式，避免修改只读对象）
  ast.nodes = ast.nodes.map(node => {
    const updates = nodeUpdates.get(node.id)
    if (updates) {
      // 创建新节点对象，保持原型链
      return Object.assign(
        Object.create(Object.getPrototypeOf(node)),
        node,
        updates
      )
    }
    return node
  })
}

/**
 * 保存工作流状态（执行前后复用）。
 * 若提供了 getViewport，则先写入 viewport 再保存。
 */
export async function saveWorkflowState(
  ast: WorkflowGraphAst | null,
  getViewport?: () => any,
  context = '执行'
): Promise<void> {
  try {
    if (!ast) return
    if (getViewport) {
      ast.viewport = getViewport()
    }
    const controller = root.get<WorkflowController>(WorkflowController)
    await controller.saveWorkflow(ast)
  } catch (error: any) {
    console.error(`[runWorkflow] ${context}保存工作流失败:`, error)
  }
}
