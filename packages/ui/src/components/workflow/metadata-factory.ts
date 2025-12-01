import { root, Type } from '@sker/core'
import { INPUT, OUTPUT, NODE } from '@sker/workflow'
import type { WorkflowNodeDefinition } from './types/workflow-nodes'

/**
 * 获取所有已注册的节点类型
 */
function getAllNodeTypes(): Type<any>[] {
  const nodeMetadatas = root.get(NODE, [])
  return nodeMetadatas.map(metadata => metadata.target)
}

/**
 * 格式化节点标签：DemoNode → Demo Node
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

/**
 * 从元数据生成工作流节点定义
 */
export function getWorkflowNodeDefinitions(): Record<string, WorkflowNodeDefinition> {
  const nodeTypes = getAllNodeTypes()
  const definitions: Record<string, WorkflowNodeDefinition> = {}

  for (const nodeClass of nodeTypes) {
    const inputMetadata = root.get(INPUT, []).filter(it => it.target === nodeClass)
    const outputMetadata = root.get(OUTPUT, []).filter(it => it.target === nodeClass)
    const nodeMetadatas = root.get(NODE, []).filter(it => it.target === nodeClass)

    const instance = new nodeClass()
    const nodeType = instance.type || nodeClass.name
    const nodeMetadata = nodeMetadatas[0]
    const customTitle = nodeMetadata?.title

    definitions[nodeType] = {
      id: nodeType,
      name: customTitle || formatNodeLabel(nodeType),
      description: customTitle || formatNodeLabel(nodeType),
      color: (nodeMetadata as any)?.color,
      icon: (nodeMetadata as any)?.icon,
      inputs: inputMetadata.map(input => ({
        id: String(input.propertyKey),
        name: input.title || formatPortLabel(String(input.propertyKey)),
        type: input.type || 'any',
        required: false,
      })),
      outputs: outputMetadata.map(output => ({
        id: String(output.propertyKey),
        name: output.title || formatPortLabel(String(output.propertyKey)),
        type: output.type || 'any',
      })),
    }
  }

  return definitions
}
