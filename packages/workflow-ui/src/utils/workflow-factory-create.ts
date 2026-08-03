import { WorkflowGraphAst, fromJson } from '@sker/workflow'
import { validateEdges } from './edgeValidator'

/**
 * 创建空白工作流
 */
export function createEmptyWorkflow(name: string = 'Untitled'): WorkflowGraphAst {
  const workflow = new WorkflowGraphAst()
  workflow.name = name
  workflow.nodes = []
  workflow.edges = []
  workflow.viewport = { x: 0, y: 0, zoom: 1 }
  return workflow
}

/**
 * 从 JSON 创建工作流（带验证和错误处理）
 */
export function createWorkflowFromJson(
  json: string | object,
  options?: {
    validateEdges?: boolean
    initializeStates?: boolean
    fallbackName?: string
  }
): { workflow: WorkflowGraphAst; errors: string[] } {
  const errors: string[] = []
  const opts = {
    validateEdges: true,
    initializeStates: true,
    fallbackName: 'Untitled',
    ...options
  }

  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const workflow = fromJson<WorkflowGraphAst>(data)

    // 验证边
    if (opts.validateEdges && workflow.edges && workflow.nodes) {
      const edgesArray = Array.isArray(workflow.edges) ? workflow.edges : []
      const nodesArray = Array.isArray(workflow.nodes) ? workflow.nodes : []

      const validEdges = validateEdges(
        edgesArray as any[],
        nodesArray
      )

      if (validEdges.length !== edgesArray.length) {
        const removedCount = edgesArray.length - validEdges.length
        errors.push(`移除了 ${removedCount} 条非法连线`)
        workflow.edges = validEdges as any
      }
    }

    // 初始化状态
    if (opts.initializeStates && workflow.nodes) {
      workflow.nodes.forEach((node: any) => {
        if (!node.state) {
          node.state = 'pending'
        }
      })
    }

    // 确保工作流有名称
    if (!workflow.name) {
      workflow.name = opts.fallbackName
    }

    return { workflow, errors }
  } catch (error: any) {
    errors.push(`解析失败: ${error?.message || '未知错误'}`)
    return { workflow: createEmptyWorkflow(opts.fallbackName), errors }
  }
}
