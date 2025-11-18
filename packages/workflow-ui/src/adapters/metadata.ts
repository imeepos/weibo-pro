import { root, Type } from '@sker/core'
import { INPUT, OUTPUT, NODE } from '@sker/workflow'
import type { NodeMetadata, PortMetadata } from '../types'

/**
 * 获取节点的输入/输出元数据
 */
export function getNodeMetadata(nodeClass: Type<any>): NodeMetadata {
  if (!nodeClass) throw new Error(`node class is null`)
  const inputMetadata = root.get(INPUT, []).filter(it => it.target === nodeClass)
  const outputMetadata = root.get(OUTPUT, []).filter(it => it.target === nodeClass)
  const nodeMetadatas = root.get(NODE, []).filter(it => it.target === nodeClass)

  const instance = new nodeClass()
  const nodeType = instance.type || nodeClass.name
  const nodeMetadata = nodeMetadatas[0]
  const customTitle = nodeMetadata?.title

  const inputs = inputMetadata.map(toPortMetadata)

  let outputs = outputMetadata.map(toPortMetadata)

  return {
    type: nodeType,
    label: customTitle || formatNodeLabel(nodeType),
    title: customTitle,
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
 */
function toPortMetadata(
  metadata: { propertyKey: string | symbol; isMulti?: boolean; title?: string; type?: string }
): PortMetadata {
  const property = String(metadata.propertyKey)
  const customTitle = metadata.title

  return {
    property,
    type: metadata.type || 'any',
    isMulti: metadata.isMulti,
    label: customTitle || formatPortLabel(property),
  }
}

/**
 * 格式化节点标签：DemoNode → Demo Node
 */
function formatNodeLabel(name: string): string {
  return name
    .replace(/Node$/, '')
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
