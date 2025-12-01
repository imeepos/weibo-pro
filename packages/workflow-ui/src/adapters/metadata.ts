import { root, Type } from '@sker/core'
import { INPUT, OUTPUT, NODE } from '@sker/workflow'
import type { NodeMetadata, PortMetadata } from '../types'
import type {
  WorkflowNodeDefinition,
  WorkflowNodeCategory
} from '@sker/ui/components/workflow/types/workflow-nodes'

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
    icon: nodeMetadata?.icon,
    color: nodeMetadata?.color,
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

/**
 * 根据节点类型推断分类
 */
function inferCategory(nodeType: string): string {
  if (nodeType.startsWith('Weibo')) return 'api'
  if (nodeType.includes('Post') || nodeType.includes('NLP')) return 'data'
  if (nodeType.includes('Event')) return 'data'
  if (nodeType.includes('LlmTextAgent')) return 'logic'
  return 'basic'
}

/**
 * 获取默认分类颜色
 */
function getCategoryColor(categoryId: string): string {
  const colors: Record<string, string> = {
    basic: '#6b7280',
    data: '#3b82f6',
    logic: '#8b5cf6',
    api: '#10b981',
  }
  return colors[categoryId] || '#6b7280'
}

/**
 * 获取所有节点分类
 */
export function getNodeCategories(): WorkflowNodeCategory[] {
  return [
    {
      id: 'basic',
      name: '基础节点',
      description: '基础工作流节点',
      color: getCategoryColor('basic'),
    },
    {
      id: 'data',
      name: '数据处理',
      description: '数据转换和处理节点',
      color: getCategoryColor('data'),
    },
    {
      id: 'logic',
      name: '逻辑控制',
      description: '条件判断和流程控制节点',
      color: getCategoryColor('logic'),
    },
    {
      id: 'api',
      name: 'API调用',
      description: '外部服务调用节点',
      color: getCategoryColor('api'),
    },
  ]
}

/**
 * 从元数据生成工作流节点定义
 */
export function getWorkflowNodeDefinitions(): Record<string, WorkflowNodeDefinition> {
  const nodeTypes = getAllNodeTypes()
  const definitions: Record<string, WorkflowNodeDefinition> = {}

  for (const nodeClass of nodeTypes) {
    const metadata = getNodeMetadata(nodeClass)
    const instance = new nodeClass()
    const nodeType = instance.type || nodeClass.name

    definitions[nodeType] = {
      id: nodeType,
      name: metadata.label,
      description: metadata.title || metadata.label,
      category: inferCategory(nodeType),
      color: metadata.color,
      icon: metadata.icon,
      inputs: metadata.inputs.map(input => ({
        id: input.property,
        name: input.label,
        type: input.type || 'any',
        required: false,
      })),
      outputs: metadata.outputs.map(output => ({
        id: output.property,
        name: output.label,
        type: output.type || 'any',
      })),
    }
  }

  return definitions
}
