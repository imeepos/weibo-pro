import { root, Type } from '@sker/core'
import { INPUT, OUTPUT, NODE, WorkflowGraphAst } from '@sker/workflow'
import type { NodeMetadata, PortMetadata } from '../types'
import { getExposedInputs, getExposedOutputs } from '../utils/workflow-ports'

/**
 * 获取节点的输入/输出元数据
 *
 * 优雅设计：
 * - WorkflowGraphAst 动态计算端口（基于内部结构）
 * - 其他节点使用装饰器定义的静态端口
 * - 支持传入类或实例
 */
export function getNodeMetadata(nodeClassOrInstance: Type<any> | any): NodeMetadata {
  if (!nodeClassOrInstance) throw new Error(`node class is null`)

  // 判断传入的是类还是实例
  const isInstance = typeof nodeClassOrInstance === 'object'
  const nodeClass = isInstance ? nodeClassOrInstance.constructor : nodeClassOrInstance
  const instance = isInstance ? nodeClassOrInstance : new nodeClass()

  const inputMetadata = root.get(INPUT, []).filter(it => it.target === nodeClass)
  const outputMetadata = root.get(OUTPUT, []).filter(it => it.target === nodeClass)
  const nodeMetadatas = root.get(NODE, []).filter(it => it.target === nodeClass)

  const nodeType = instance.type || nodeClass.name
  const nodeMetadata = nodeMetadatas[0]
  const customTitle = nodeMetadata?.title
  const categoryType = nodeMetadata?.type

  // 获取实例级别的自定义端口标签
  const portLabels: Record<string, string> = instance.portLabels || {}

  let inputs: PortMetadata[] = inputMetadata.map(m => toPortMetadata(m, portLabels))
  let outputs: PortMetadata[] = outputMetadata.map(m => toPortMetadata(m, portLabels))

  // WorkflowGraphAst 特殊处理：动态计算端口
  // 优雅设计：使用纯函数，无需依赖类方法，可直接处理序列化对象
  if (nodeType === 'WorkflowGraphAst') {
    const exposedInputs = getExposedInputs(instance)
    inputs = exposedInputs.map(input => ({
      property: `${input.nodeId}.${input.property}`,
      type: input.type || 'any',
      label: input.title || formatPortLabel(input.property),
      isMulti: false
    }))

    const exposedOutputs = getExposedOutputs(instance)
    outputs = exposedOutputs.map(output => ({
      property: `${output.nodeId}.${output.property}`,
      type: output.type || 'any',
      label: output.title || formatPortLabel(output.property),
      isMulti: false
    }))
  }

  return {
    type: nodeType,
    label: customTitle || formatNodeLabel(nodeType),
    title: customTitle,
    nodeType: categoryType,
    inputs,
    outputs,
  }
}

/**
 * 获取所有已注册的节点类型
 */
export function getAllNodeTypes(): Type<any>[] {
  const nodeMetadatas = root.get(NODE, [])
  return nodeMetadatas.map(metadata => metadata.target)
}

export function findNodeType<T = any>(name: string): Type<T> | undefined {
  return getAllNodeTypes().find((type: any) => type.name === name)
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
