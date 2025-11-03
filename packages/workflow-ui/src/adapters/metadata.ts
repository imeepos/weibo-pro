import { root, Type } from '@sker/core'
import { INPUT, OUTPUT, NODE } from '@sker/workflow'
import type { NodeMetadata, PortMetadata } from '../types'

/**
 * 获取节点的输入/输出元数据
 */
export function getNodeMetadata(nodeClass: Type<any>): NodeMetadata {
  const inputs = root.get(INPUT, []).filter(it => it.target === nodeClass)
  const outputs = root.get(OUTPUT, []).filter(it => it.target === nodeClass)

  const instance = new nodeClass()
  const nodeType = instance.type || nodeClass.name

  return {
    type: nodeType,
    label: formatNodeLabel(nodeType),
    inputs: inputs.map(toPortMetadata),
    outputs: outputs.map(toPortMetadata),
  }
}

/**
 * 获取所有已注册的节点类型
 */
export function getAllNodeTypes(): Type<any>[] {
  return root.get(NODE, [])
}

/**
 * 转换为端口元数据
 */
function toPortMetadata(
  metadata: { propertyKey: string | symbol; isMulti?: boolean }
): PortMetadata {
  const property = String(metadata.propertyKey)
  return {
    property,
    type: 'any', // TypeScript 运行时无法获取类型，需要通过其他方式推断
    isMulti: metadata.isMulti,
    label: formatPortLabel(property),
  }
}

/**
 * 格式化节点标签：DemoNode → Demo Node
 */
function formatNodeLabel(name: string): string {
  return name
    .replace(/Node$/, '') // 移除 Node 后缀
    .replace(/([A-Z])/g, ' $1') // 在大写字母前添加空格
    .trim()
}

/**
 * 格式化端口标签：userName → User Name
 */
function formatPortLabel(property: string): string {
  return property
    .replace(/([A-Z])/g, ' $1') // 在大写字母前添加空格
    .replace(/^./, str => str.toUpperCase()) // 首字母大写
    .trim()
}
