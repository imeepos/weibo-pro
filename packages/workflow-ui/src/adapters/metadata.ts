import { isNode, INode } from '@sker/workflow'
import type { NodeMetadata, PortMetadata } from '../types'
import { getExposedInputs, getExposedOutputs } from '../utils/workflow-ports'

/**
 * 获取节点的输入/输出元数据
 *
 * 优雅设计：
 * - ✨强制使用编译后的 node.metadata 字段
 * - 不支持从装饰器读取元数据（确保一致性）
 * - WorkflowGraphAst 动态计算端口（基于内部结构）
 *
 * 存在即合理：
 * - 编译后的节点自包含元数据，无需依赖装饰器
 * - 统一管理元数据获取路径，避免多处实现
 */
export function getNodeMetadata(node: INode): NodeMetadata {
  if (!node) throw new Error(`node is null`)
  if (!isNode(node)) throw new Error(`node must be compiled with metadata field`)

  const nodeType = node.type

  // 获取实例级别的自定义端口标签
  const portLabels: Record<string, string> = node.portLabels || {}

  let inputs: PortMetadata[] = node.metadata.inputs.map((m: any) => toPortMetadata(m, portLabels))
  let outputs: PortMetadata[] = node.metadata.outputs.map((m: any) => toPortMetadata(m, portLabels))

  // WorkflowGraphAst 特殊处理：动态计算端口
  if (nodeType === 'WorkflowGraphAst') {
    const exposedInputs = getExposedInputs(node)
    inputs = exposedInputs.map(input => ({
      property: `${input.nodeId}.${input.property}`,
      type: input.type || 'any',
      label: input.title || formatPortLabel(input.property),
      isMulti: false
    }))

    const exposedOutputs = getExposedOutputs(node)
    outputs = exposedOutputs.map(output => ({
      property: `${output.nodeId}.${output.property}`,
      type: output.type || 'any',
      label: output.title || formatPortLabel(output.property),
      isMulti: false
    }))
  }

  return {
    type: nodeType,
    label: node.metadata.class.title || formatNodeLabel(nodeType),
    title: node.metadata.class.title,
    nodeType: node.metadata.class.type,
    inputs,
    outputs,
  }
}


/**
 * 转换为端口元数据
 * portLabels: 实例级别的自定义标签，优先级最高
 */
function toPortMetadata(
  metadata: { propertyKey: string | symbol; isMulti?: boolean; mode?: number; title?: string; type?: string },
  portLabels: Record<string, string> = {}
): PortMetadata {
  const property = String(metadata.propertyKey)
  // 优先级：实例自定义标签 > 装饰器 title > 属性名格式化
  const label = portLabels[property] || metadata.title || formatPortLabel(property)

  return {
    property,
    type: metadata.type || 'any',
    isMulti: metadata.isMulti,
    mode: metadata.mode,
    label,
  }
}

/**
 * 格式化节点标签：DemoAst → Demo
 */
function formatNodeLabel(name: string): string {
  return name
    .replace(/Ast$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim()
}

/**
 * 格式化端口标签：userName → User Name
 */
function formatPortLabel(property: string): string {
  return property
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}
