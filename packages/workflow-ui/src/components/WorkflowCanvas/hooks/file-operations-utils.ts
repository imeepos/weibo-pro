import { WorkflowGraphAst, INode, IEdge, generateId } from '@sker/workflow'
import { getAllNodeTypes } from '../../../adapters'

/**
 * 重新生成节点和边的 ID（但保持工作流 ID 不变）
 *
 * 这确保导入的节点不会与现有节点产生 ID 冲突，
 * 但工作流本身的 code 保持不变，避免覆盖原工作流
 */
export function regenerateIds(ast: WorkflowGraphAst): WorkflowGraphAst {
  // 创建一个 ID 映射表，用于更新边的引用
  const idMap = new Map<string, string>()

  // ⚠️ 不重新生成工作流 ID，保持当前工作流的 code
  idMap.clear()

  // 递归处理节点（包括分组内的节点）
  const processNodes = (nodes: INode[]): INode[] => {
    return nodes.map(node => {
      // 生成新的节点 ID
      const oldId = node.id
      const newId = generateId()
      idMap.set(oldId, newId)

      // 更新节点 ID
      node.id = newId

      // 如果是分组节点，递归处理子节点
      if ((node as any).isGroupNode && (node as any).nodes?.length > 0) {
        ;(node as any).nodes = processNodes((node as any).nodes)
      }

      return node
    })
  }

  // 处理所有节点
  ast.nodes = processNodes(ast.nodes)

  // 更新边的 ID 和节点引用
  const processEdges = (edges: IEdge[]): IEdge[] => {
    return edges.map(edge => {
      // 生成新的边 ID
      edge.id = generateId()

      // 更新边的源节点和目标节点引用
      if (edge.from && idMap.has(edge.from)) {
        edge.from = idMap.get(edge.from)!
      }
      if (edge.to && idMap.has(edge.to)) {
        edge.to = idMap.get(edge.to)!
      }

      return edge
    })
  }

  // 处理所有边
  ast.edges = processEdges(ast.edges)

  // 更新入口和结束节点引用
  if (ast.entryNodeIds) {
    ast.entryNodeIds = ast.entryNodeIds.map(id => idMap.get(id) || id)
  }
  if (ast.endNodeIds) {
    ast.endNodeIds = ast.endNodeIds.map(id => idMap.get(id) || id)
  }

  return ast
}

/**
 * 验证工作流数据的完整性
 *
 * 优雅设计：
 * - 分层验证：格式 → 节点类型 → 边完整性
 * - 详细的错误信息，帮助用户定位问题
 * - 返回 { valid, errors } 结构，便于批量展示错误
 */
export function validateWorkflowData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 1. 基础格式验证
  if (!data || typeof data !== 'object') {
    errors.push('无效的数据格式')
    return { valid: false, errors }
  }

  if (!data.workflow) {
    errors.push('缺少 workflow 字段')
    return { valid: false, errors }
  }

  const workflowData = data.workflow

  // 2. 工作流结构验证
  if (!workflowData.type || workflowData.type !== 'WorkflowGraphAst') {
    errors.push(`无效的工作流类型: ${workflowData.type || '未指定'}`)
  }

  if (!Array.isArray(workflowData.nodes)) {
    errors.push('nodes 字段必须是数组')
  }

  if (!Array.isArray(workflowData.edges)) {
    errors.push('edges 字段必须是数组')
  }

  // 如果基础结构有问题，直接返回
  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // 3. 节点类型验证
  const registeredNodeTypes = getAllNodeTypes()
  const nodeTypeNames = new Set(registeredNodeTypes.map((type: any) => type.name))
  const nodeIds = new Set<string>()

  workflowData.nodes.forEach((node: INode, index: number) => {
    // 收集节点 ID
    if (node.id) {
      nodeIds.add(node.id)
    } else {
      errors.push(`节点 #${index + 1} 缺少 id 字段`)
    }

    // 检查节点类型是否已注册
    if (!node.type) {
      errors.push(`节点 #${index + 1} (id: ${node.id || 'unknown'}) 缺少 type 字段`)
    } else if (!nodeTypeNames.has(node.type)) {
      errors.push(
        `节点 #${index + 1} (id: ${node.id}) 的类型 "${node.type}" 未注册。` +
        `请确保所有必需的节点类型已安装。`
      )
    }
  })

  // 4. 边完整性验证
  workflowData.edges.forEach((edge: any, index: number) => {
    if (!edge.from) {
      errors.push(`边 #${index + 1} 缺少 from 字段`)
    } else if (!nodeIds.has(edge.from)) {
      errors.push(`边 #${index + 1} 的源节点 "${edge.from}" 不存在`)
    }

    if (!edge.to) {
      errors.push(`边 #${index + 1} 缺少 to 字段`)
    } else if (!nodeIds.has(edge.to)) {
      errors.push(`边 #${index + 1} 的目标节点 "${edge.to}" 不存在`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}
