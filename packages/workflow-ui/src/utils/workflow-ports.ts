import { root } from '@sker/core'
import { INPUT, OUTPUT, NODE, type INode, type IEdge } from '@sker/workflow'

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
 */
export function getExposedInputs(workflow: WorkflowData): PortInfo[] {
  const exposedInputs: PortInfo[] = []

  for (const node of workflow.nodes) {
    // 跳过 WorkflowGraphAst 自身
    if (node.type === 'WorkflowGraphAst') continue

    // 检查该节点是否有入边
    const isConnected = workflow.edges.some(edge => edge.to === node.id)
    if (isConnected) continue

    try {
      // 通过 type 查找对应的类
      const nodeRegistry = root.get(NODE, [])
      const nodeMetadata = nodeRegistry.find((meta: any) => meta.target.name === node.type)
      const ctor = nodeMetadata?.target
      if (!ctor) continue

      // 获取该节点的输入元数据
      const inputMetadatas = root.get(INPUT, [])
      const nodeInputs = inputMetadatas.filter((meta: any) => meta.target === ctor)

      // 所有输入端口都暴露
      for (const inputMeta of nodeInputs) {
        const property = String(inputMeta.propertyKey)
        exposedInputs.push({
          nodeId: node.id,
          property,
          title: inputMeta.title || property,
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
 */
export function getExposedOutputs(workflow: WorkflowData): PortInfo[] {
  const exposedOutputs: PortInfo[] = []

  for (const node of workflow.nodes) {
    // 检查该节点是否有入边
    const isConnected = workflow.edges.some(edge => edge.from === node.id)
    if (isConnected) continue
    // 跳过 WorkflowGraphAst 自身
    if (node.type === 'WorkflowGraphAst') continue

    try {
      // 通过 type 查找对应的类
      const nodeRegistry = root.get(NODE, [])
      const nodeMetadata = nodeRegistry.find((meta: any) => meta.target.name === node.type)
      const ctor = nodeMetadata?.target
      if (!ctor) continue

      // 获取该节点的输出元数据
      const outputMetadatas = root.get(OUTPUT, [])
      const nodeOutputs = outputMetadatas.filter((meta: any) => meta.target === ctor)

      // 检查每个输出端口是否被连接
      for (const outputMeta of nodeOutputs) {
        const property = String(outputMeta.propertyKey)
        const isConnected = workflow.edges.some(edge =>
          edge.from === node.id && edge.fromProperty === property
        )

        // 如果未连接，则暴露为工作流的输出
        if (!isConnected) {
          exposedOutputs.push({
            nodeId: node.id,
            property,
            title: outputMeta.title || property,
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
