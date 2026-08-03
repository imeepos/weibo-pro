import React from 'react'
import type { IAstStates, INode, WorkflowGraphAst } from '@sker/workflow'

/**
 * 工具函数集：从 useWorkflowOperations 中提取的纯函数模块
 *
 * 职责单一：只包含无副作用或副作用可控的辅助函数，
 * 供各个执行子 hook 复用。
 */

/** 递归提取最深层 cause，用于定位真实的错误来源 */
export function extractDeepestError(error: any): any {
  if (!error) return null
  return error.cause ? extractDeepestError(error.cause) : error
}

/** 从任意错误中提取用户可读的 message 与 type */
export function extractErrorInfo(error: unknown): { message: string; type?: string } {
  if (!error) return { message: '未知错误' }

  if (typeof error === 'object' && 'message' in error) {
    const err = error as any
    const deepError = err.cause ? extractDeepestError(err.cause) : err
    const rawMessage = deepError?.message || err.message || '执行失败'
    const message = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage)

    if (message.includes('登录') || message.includes('LOGIN')) {
      return { message: '登录态已过期，需要更换账号', type: 'LOGIN_EXPIRED' }
    }
    return { message, type: err.type }
  }

  return { message: typeof error === 'string' ? error : String(error) }
}

/** 从 metadata 收集属性更新 */
export function collectPropertyUpdates(
  metadata: { property: string | symbol }[] | undefined,
  source: Record<string, any>
): Record<string, any> {
  const updates: Record<string, any> = {}
  metadata?.forEach((item: any) => {
    const propKey = String(item.property)
    if (source[propKey] !== undefined) {
      updates[propKey] = source[propKey]
    }
  })
  return updates
}

/** 合并节点状态：保持原型链，仅覆盖运行产生的可变字段 */
export function mergeNodeState(originalNode: INode, updatedNode: any): INode {
  const inputUpdates = collectPropertyUpdates(originalNode.metadata?.inputs, updatedNode)
  const outputUpdates = collectPropertyUpdates(originalNode.metadata?.outputs, updatedNode)

  return Object.assign(
    Object.create(Object.getPrototypeOf(originalNode)),
    originalNode,
    {
      state: updatedNode.state,
      error: updatedNode.error,
      count: updatedNode.count,
      emitCount: updatedNode.emitCount,
      ...inputUpdates,
      ...outputUpdates
    }
  )
}

/**
 * 追踪节点执行状态，将运行开始/结束写入执行记录
 */
export function trackNodeExecution(
  originalNode: INode,
  updatedNode: any,
  nodeRecordIds: React.MutableRefObject<Map<string, string>>,
  recordNodeStart: (nodeId: string) => string,
  recordNodeComplete: (nodeId: string, recordId: string, status: IAstStates, error?: { message: string }, outputs?: Record<string, unknown>) => void
) {
  if (updatedNode.state === 'running' && !nodeRecordIds.current.has(updatedNode.id)) {
    nodeRecordIds.current.set(updatedNode.id, recordNodeStart(updatedNode.id))
  } else if ((updatedNode.state === 'success' || updatedNode.state === 'fail') && nodeRecordIds.current.has(updatedNode.id)) {
    const outputs = collectPropertyUpdates(originalNode.metadata?.outputs, updatedNode)
    recordNodeComplete(
      updatedNode.id,
      nodeRecordIds.current.get(updatedNode.id)!,
      updatedNode.state,
      updatedNode.error ? { message: String(updatedNode.error.message || updatedNode.error) } : undefined,
      Object.keys(outputs).length > 0 ? outputs : undefined
    )
    nodeRecordIds.current.delete(updatedNode.id)
  }
}

/**
 * 重置有入边连接的输入属性为默认值
 *
 * 设计理由：
 * - 只重置有入边的输入属性，保留用户手动配置的值
 * - 确保上一次运行的结果不会影响当前运行
 * - 使用 metadata.inputs 中的 defaultValue 作为重置值
 */
export function resetConnectedInputs(workflowAst: WorkflowGraphAst): void {
  const { nodes, edges } = workflowAst

  // 收集每个节点有入边连接的输入属性
  const connectedInputs = new Map<string, Set<string>>()

  for (const edge of edges) {
    const targetNodeId = edge.to
    const targetProperty = edge.toProperty

    if (targetProperty) {
      if (!connectedInputs.has(targetNodeId)) {
        connectedInputs.set(targetNodeId, new Set())
      }
      connectedInputs.get(targetNodeId)!.add(targetProperty)
    }
  }

  // 重置有入边连接的输入属性
  for (const node of nodes) {
    const nodeConnectedInputs = connectedInputs.get(node.id)
    if (!nodeConnectedInputs || nodeConnectedInputs.size === 0) continue

    const nodeInputs = node.metadata?.inputs || []
    for (const inputMeta of nodeInputs) {
      const property = String(inputMeta.property)

      // 只重置有入边连接的属性
      if (nodeConnectedInputs.has(property)) {
        const defaultValue = inputMeta.defaultValue
        if (defaultValue !== undefined) {
          // 深拷贝默认值避免引用类型污染
          (node as any)[property] = JSON.parse(JSON.stringify(defaultValue))
        } else {
          // 没有 defaultValue 时，根据类型设置合理默认值
          (node as any)[property] = Array.isArray((node as any)[property]) ? [] : undefined
        }
      }
    }
  }
}
