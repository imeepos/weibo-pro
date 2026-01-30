import type { INode, IEdge } from '@sker/workflow'
import type { Compiler } from '@sker/workflow/src/compiler'
import type { SerializedNode, SerializedEdge, BoundingBox, NodeSize } from '../types/cross-workflow-clipboard.types'
import { DEFAULT_NODE_SIZE } from '../constants/broadcast-channels'
import { clone } from '@sker/workflow/src/utils'

/**
 * 序列化工具函数
 *
 * 用于将节点和边数据序列化为可跨标签页传输的格式
 * 处理循环引用、不可序列化数据等问题
 */

/**
 * 获取节点尺寸
 *
 * @param node - 节点对象
 * @returns 节点尺寸（宽度和高度）
 */
export function getNodeSize(node: any): NodeSize {
  // 优先使用节点自身的尺寸
  if (node.width && node.height) {
    return { width: node.width, height: node.height }
  }

  // 其次使用测量尺寸
  if (node.measured?.width && node.measured?.height) {
    return { width: node.measured.width, height: node.measured.height }
  }

  // 使用默认尺寸
  return DEFAULT_NODE_SIZE
}

/**
 * 计算包围盒
 *
 * @param nodes - 节点列表
 * @returns 包围盒信息
 */
export function calculateBoundingBox(nodes: Array<{ position: { x: number; y: number } } & Partial<NodeSize>>): BoundingBox {
  if (nodes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
      centerX: 0,
      centerY: 0,
    }
  }

  const positions = nodes.map((node) => {
    const size = getNodeSize(node)
    return {
      x: node.position.x,
      y: node.position.y,
      width: size.width,
      height: size.height,
    }
  })

  const minX = Math.min(...positions.map((p) => p.x))
  const maxX = Math.max(...positions.map((p) => p.x + p.width))
  const minY = Math.min(...positions.map((p) => p.y))
  const maxY = Math.max(...positions.map((p) => p.y + p.height))

  const width = maxX - minX
  const height = maxY - minY

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

/**
 * 序列化单个节点
 *
 * 提取节点的可序列化字段，避免循环引用和不可序列化数据
 *
 * @param node - 节点对象
 * @returns 序列化的节点数据
 */
export function serializeNode(node: INode): SerializedNode {
  // 使用 clone 函数处理循环引用和不可序列化数据
  const clonedData = clone(node)

  // 确保必要的字段存在
  return {
    id: node.id,
    type: node.type,
    data: {
      ...clonedData,
      // 保留关键字段
      name: node.name,
      description: node.description,
      color: node.color,
      // 不保留 metadata（将在反序列化时重新编译）
      // 不保留运行时状态（state, count, emitCount, error）
    },
    position: {
      x: node.position.x,
      y: node.position.y,
    },
  }
}

/**
 * 反序列化单个节点
 *
 * 将序列化的节点数据转换回 INode，并重新编译以恢复 metadata
 *
 * @param data - 序列化的节点数据
 * @param compiler - 编译器实例
 * @returns 反序列化的节点
 */
export function deserializeNode(data: SerializedNode, compiler: Compiler): INode {
  // 创建节点数据对象（确保包含所有必需字段）
  const nodeData: INode = {
    id: data.id,
    type: data.type,
    position: data.position,
    state: 'pending', // 默认状态
    count: 0, // 默认计数
    emitCount: 0, // 默认发射计数
    error: undefined, // 默认无错误
    ...data.data,
  }

  // 使用编译器编译节点，恢复 metadata
  const compiledNode = compiler.compile(nodeData)

  return compiledNode
}

/**
 * 序列化边
 *
 * 提取边的可序列化字段
 *
 * @param edge - 边对象
 * @returns 序列化的边数据
 */
export function serializeEdge(edge: IEdge): SerializedEdge {
  return {
    id: edge.id,
    from: edge.from,
    to: edge.to,
    fromProperty: edge.fromProperty,
    toProperty: edge.toProperty,
    weight: edge.weight,
    mode: edge.mode,
    isPrimary: edge.isPrimary,
    transform: edge.transform,
  }
}

/**
 * 反序列化边
 *
 * 将序列化的边数据转换回 IEdge
 *
 * @param data - 序列化的边数据
 * @returns 反序列化的边
 */
export function deserializeEdge(data: SerializedEdge): IEdge {
  return {
    id: data.id,
    from: data.from,
    to: data.to,
    fromProperty: data.fromProperty,
    toProperty: data.toProperty,
    weight: data.weight,
    mode: data.mode as any,
    isPrimary: data.isPrimary,
    transform: data.transform,
  }
}

/**
 * 批量序列化节点
 *
 * @param nodes - 节点数组
 * @returns 序列化的节点数组
 */
export function serializeNodes(nodes: INode[]): SerializedNode[] {
  return nodes.map(serializeNode)
}

/**
 * 批量反序列化节点
 *
 * @param nodes - 序列化的节点数组
 * @param compiler - 编译器实例
 * @returns 反序列化的节点数组
 */
export function deserializeNodes(nodes: SerializedNode[], compiler: Compiler): INode[] {
  return nodes.map((node) => deserializeNode(node, compiler))
}

/**
 * 批量序列化边
 *
 * @param edges - 边数组
 * @returns 序列化的边数组
 */
export function serializeEdges(edges: IEdge[]): SerializedEdge[] {
  return edges.map(serializeEdge)
}

/**
 * 批量反序列化边
 *
 * @param edges - 序列化的边数组
 * @returns 反序列化的边数组
 */
export function deserializeEdges(edges: SerializedEdge[]): IEdge[] {
  return edges.map(deserializeEdge)
}

/**
 * 过滤相关边
 *
 * 只保留连接指定节点的边
 *
 * @param edges - 边数组
 * @param nodeIds - 节点ID集合
 * @returns 过滤后的边数组
 */
export function filterRelevantEdges(edges: IEdge[], nodeIds: Set<string>): IEdge[] {
  return edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
}
