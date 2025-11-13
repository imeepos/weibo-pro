import type { INode, IEdge } from '@sker/workflow'
import type { WorkflowNode, WorkflowEdge } from '../types'

/**
 * FlowAstConverter - 类型安全的 AST 与 React Flow 转换器
 *
 * 优雅设计原则：
 * 1. 类型安全：使用泛型确保转换过程中的类型约束
 * 2. 引用透明：直接引用 AST 实例，避免昂贵的深拷贝
 * 3. 单向转换：仅提供 AST → Flow 转换，Flow → AST 通过直接引用实现
 *
 * @example
 * ```typescript
 * // 转换单个节点
 * const flowNode = FlowAstConverter.toFlowNode(astNode)
 *
 * // 转换整个工作流
 * const { nodes, edges } = FlowAstConverter.convertWorkflow(ast)
 * ```
 */
export class FlowAstConverter {
  /**
   * 将 AST 节点转换为 React Flow 节点
   * @param node - AST 节点实例（类型安全）
   * @returns React Flow 节点（data 属性直接引用 AST 实例）
   *
   * 设计亮点：
   * - 使用泛型 T extends INode 确保类型约束
   * - data 属性直接引用 node，保持引用透明性
   * - 无需类型断言，编译期类型安全
   */
  static toFlowNode<T extends INode>(node: T): WorkflowNode<T> {
    return {
      id: node.id,
      type: node.type,
      position: node.position || { x: 0, y: 0 },
      data: node // 直接引用，而非深拷贝
    }
  }

  /**
   * 批量转换 AST 节点为 React Flow 节点
   * @param nodes - AST 节点数组
   * @returns React Flow 节点数组
   */
  static toFlowNodes<T extends INode>(nodes: T[]): WorkflowNode<T>[] {
    return nodes.map((node) => this.toFlowNode(node))
  }

  /**
   * 转换单个边
   * @param edge - AST 边定义
   * @param index - 数组索引，用于生成 stable id
   * @returns React Flow 边
   */
  static toFlowEdge(edge: IEdge, index: number): WorkflowEdge {
    // 生成稳定且唯一的 id
    const stableId = this.generateStableEdgeId(edge, index)

    return {
      id: stableId,
      source: edge.from,
      target: edge.to,
      sourceHandle: edge.fromProperty || null,
      targetHandle: edge.toProperty || null,
      type: 'workflow-data-edge',
      data: {
        edge,
        fromProperty: edge.fromProperty,
        toProperty: edge.toProperty,
        weight: (edge as any).weight
      }
    }
  }

  /**
   * 批量转换 AST 边为 React Flow 边
   * @param edges - AST 边数组
   * @returns React Flow 边数组
   */
  static toFlowEdges(edges: IEdge[]): WorkflowEdge[] {
    return edges.map((edge, index) => this.toFlowEdge(edge, index))
  }

  /**
   * 转换整个工作流（节点和边）
   * @param ast - 包含 nodes 和 edges 的工作流对象
   * @returns 转换后的 React Flow 节点和边
   */
  static convertWorkflow<T extends INode>(ast: {
    nodes: T[]
    edges: IEdge[]
  }): {
    nodes: WorkflowNode<T>[]
    edges: WorkflowEdge[]
  } {
    return {
      nodes: this.toFlowNodes(ast.nodes),
      edges: this.toFlowEdges(ast.edges)
    }
  }

  /**
   * 生成稳定的边 ID
   *
   * 稳定性原则：
   * - 相同源、目标、属性的边始终生成相同 ID
   * - 即使数组顺序变化，ID 保持不变
   * - 避免重复边的创建
   *
   * @param edge - AST 边定义
   * @param index - 备用索引（仅在必要时使用）
   * @private
   */
  private static generateStableEdgeId(edge: IEdge, index: number): string {
    const parts = [
      edge.from,
      edge.to,
      edge.fromProperty || '',
      edge.toProperty || ''
    ].filter(Boolean)

    // 如果边有足够的信息生成稳定 ID，则使用它
    if (parts.length >= 2) {
      return `edge-${parts.join('-')}`
    }

    // 否则使用索引作为后备方案
    return `edge-${index}`
  }
}

/**
 * 快捷函数：转换单个节点
 * @param node - AST 节点
 * @returns React Flow 节点
 */
export function toFlowNode<T extends INode>(node: T): WorkflowNode<T> {
  return FlowAstConverter.toFlowNode(node)
}

/**
 * 快捷函数：批量转换节点
 * @param nodes - AST 节点数组
 * @returns React Flow 节点数组
 */
export function toFlowNodes<T extends INode>(nodes: T[]): WorkflowNode<T>[] {
  return FlowAstConverter.toFlowNodes(nodes)
}

/**
 * 快捷函数：转换单个边
 * @param edge - AST 边
 * @param index - 索引
 * @returns React Flow 边
 */
export function toFlowEdge(edge: IEdge, index: number): WorkflowEdge {
  return FlowAstConverter.toFlowEdge(edge, index)
}

/**
 * 快捷函数：批量转换边
 * @param edges - AST 边数组
 * @returns React Flow 边数组
 */
export function toFlowEdges(edges: IEdge[]): WorkflowEdge[] {
  return FlowAstConverter.toFlowEdges(edges)
}

/**
 * 快捷函数：转换整个工作流
 * @param ast - 工作流对象
 * @returns 转换后的节点和边
 */
export function convertWorkflow<T extends INode>(ast: {
  nodes: T[]
  edges: IEdge[]
}): {
  nodes: WorkflowNode<T>[]
  edges: WorkflowEdge[]
} {
  return FlowAstConverter.convertWorkflow(ast)
}
