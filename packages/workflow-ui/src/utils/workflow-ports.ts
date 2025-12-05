import { type INode, type IEdge, isINode, WorkflowGraphAst } from '@sker/workflow'

/**
 * 端口信息
 */
export interface PortInfo {
  nodeId: string
  property: string
  title?: string
  type?: string
  required?: boolean
}

/**
 * 工作流数据接口
 */
export interface WorkflowData {
  nodes: INode[]
  edges: IEdge[]
}

/**
 * 获取工作流的暴露输入端口
 *
 * 优雅设计：
 * - 纯函数，无副作用
 * - 不依赖类方法，可直接处理序列化后的对象
 * - 输入端口 = 内部节点的未连接输入
 * - ✨使用 node.metadata.inputs，不依赖装饰器
 */
export function getWorkflowGraphlNodes(workflow: WorkflowGraphAst): INode[] {
  if (workflow && workflow.nodes) return workflow.nodes
  return []
}
export function getExposedInputs(workflow: INode): PortInfo[] {
  if (!isINode(workflow)) {
    throw new Error(`getExposedInputs error: `, workflow)
  }
  const exposedInputs: PortInfo[] = []
  const nodes = getWorkflowGraphlNodes(workflow as WorkflowGraphAst)
  const edges = getWorkflowGraphlEdges(workflow as WorkflowGraphAst)

  for (const node of nodes) {
    // 跳过 WorkflowGraphAst 自身
    if (node.type === 'WorkflowGraphAst') continue

    // 检查该节点是否有入边
    const isConnected = edges.some(edge => edge.to === node.id)
    if (isConnected) continue

    try {
      // ✨使用编译后的 node.metadata.inputs
      const nodeName = node.name || node.metadata!.class.title || node.type
      const nodeInputs = node.metadata!.inputs

      // 所有输入端口都暴露
      for (const inputMeta of nodeInputs) {
        const property = String(inputMeta.property)
        exposedInputs.push({
          nodeId: node.id,
          property,
          title: `${nodeName}.${inputMeta.title || property}`,
          type: inputMeta.type,
          required: inputMeta.required
        })
      }
    } catch (error) {
      continue
    }
  }

  return exposedInputs
}

/**
 * 获取工作流的暴露输出端口
 *
 * 优雅设计：
 * - 纯函数，无副作用
 * - 不依赖类方法，可直接处理序列化后的对象
 * - 输出端口 = 内部节点的未连接输出
 * - ✨使用 node.metadata.outputs，不依赖装饰器
 */
export function getWorkflowGraphlEdges(workflow: WorkflowGraphAst): IEdge[] {
  if (workflow && workflow.edges) return workflow.edges
  return []
}
export function getExposedOutputs(workflow: INode): PortInfo[] {
  const exposedOutputs: PortInfo[] = []
  const nodes = getWorkflowGraphlNodes(workflow as WorkflowGraphAst)
  const edges = getWorkflowGraphlEdges(workflow as WorkflowGraphAst)

  for (const node of nodes) {
    // 跳过 WorkflowGraphAst 自身
    if (node.type === 'WorkflowGraphAst') continue

    try {
      // ✨使用编译后的 node.metadata.outputs
      const nodeName = node.name || node.metadata!.class.title || node.type
      const nodeOutputs = node.metadata!.outputs

      // 检查每个输出端口是否被连接
      for (const outputMeta of nodeOutputs) {
        const property = String(outputMeta.property)
        const isConnected = edges.some((edge: IEdge) =>
          edge.from === node.id && edge.fromProperty === property
        )

        // 如果未连接，则暴露为工作流的输出
        if (!isConnected) {
          exposedOutputs.push({
            nodeId: node.id,
            property,
            title: `${nodeName}.${outputMeta.title || property}`,
            type: outputMeta.type
          })
        }
      }
    } catch (error) {
      continue
    }
  }

  return exposedOutputs
}
