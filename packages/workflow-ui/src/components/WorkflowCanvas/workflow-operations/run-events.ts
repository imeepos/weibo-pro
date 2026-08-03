import type { UseWorkflowReturn } from '../../../hooks/useWorkflow'

/**
 * 运行事件应用模块
 *
 * 将 runWorkflow 执行过程中产生的 Observable 事件，应用到 workflow AST 并同步到 UI。
 * 集中处理 node_success / node_fail / node_runing / node_emit / node_progress / node_delta
 * 六类节点事件，保持事件处理逻辑单一职责。
 */

/** 以不可变方式创建新节点：保持原型链，仅覆盖 patch 字段 */
function cloneNodeWith(node: any, patch: Record<string, any>) {
  return Object.assign(Object.create(Object.getPrototypeOf(node)), node, patch)
}

/**
 * 应用单个执行事件到工作流 AST，并在完成后同步到 React Flow。
 *
 * 行为与拆分前完全一致：
 * - node_success / node_fail / node_runing：更新节点状态
 * - node_emit：合并 event.data 到节点（实时输出）
 * - node_progress：更新进度，保持 running 状态
 * - node_delta：累积流式数据，保持 running 状态
 */
export function applyWorkflowRunEvent(workflow: UseWorkflowReturn, event: any): void {
  switch (event.type) {
    case 'node_success': {
      // 处理节点成功状态
      workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
        if (originalNode.id === event.id) {
          return cloneNodeWith(originalNode, { state: 'success' })
        }
        return originalNode
      })
      break
    }
    case 'node_fail': {
      // 处理节点失败状态
      workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
        if (originalNode.id === event.id) {
          return cloneNodeWith(originalNode, { state: 'fail', error: event.error })
        }
        return originalNode
      })
      break
    }
    case 'node_runing': {
      // 处理节点运行状态
      workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
        if (originalNode.id === event.id) {
          return cloneNodeWith(originalNode, { state: 'running' })
        }
        return originalNode
      })
      break
    }
    case 'node_emit': {
      // 处理属性实时更新（qrcode, message, account 等）
      let found = false
      workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
        if (originalNode.id === event.id) {
          found = true
          return cloneNodeWith(originalNode, event.data)
        }
        return originalNode
      })

      if (!found) {
        console.warn(`[runWorkflow] 未找到节点 ${event.id}，无法更新属性`)
      }
      break
    }
    case 'node_progress': {
      // 处理节点进度事件（工具调用、阶段性任务）
      workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
        if (originalNode.id === event.id) {
          // 保持 running 状态，只更新进度信息
          return cloneNodeWith(originalNode, {
            progress: (event as any).data,
            state: originalNode.state || 'running' // 确保状态为 running
          })
        }
        return originalNode
      })
      break
    }
    case 'node_delta': {
      // 处理节点增量输出（流式数据）
      console.log(`[runWorkflow] node_delta 事件: nodeId=${event.id}`)

      workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
        if (originalNode.id === event.id) {
          const deltaData = (event as any).data
          // 累积流式数据
          return cloneNodeWith(originalNode, {
            delta: deltaData.delta,
            accumulated: deltaData.accumulated,
            state: originalNode.state || 'running' // 确保状态为 running
          })
        }
        return originalNode
      })
      break
    }
    default:
      break
  }

  workflow.syncFromAst()
}
