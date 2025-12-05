import { Compiler, generateId, type INode } from '@sker/workflow'
import { root } from '@sker/core'
import type { Type } from '@sker/core'

/**
 * 创建并编译节点
 *
 * 优雅设计：
 * - 统一节点创建流程，确保所有节点都经过编译
 * - 自动生成 ID，避免重复
 * - 自动注入 metadata，保证节点完整性
 *
 * @param NodeClass 节点类构造函数
 * @param options 可选配置
 * @returns 编译后的节点（包含 metadata 字段）
 */
export function createCompiledNode<T extends INode>(
  NodeClass: Type<T>,
  options?: {
    id?: string
    position?: { x: number; y: number }
    [key: string]: any
  }
): T {
  const compiler = root.get(Compiler)

  // 创建节点实例
  const ast = new NodeClass()

  // 设置 ID
  ast.id = options?.id || generateId()

  // 设置位置
  if (options?.position) {
    ast.position = options.position
  }

  // 设置其他属性
  if (options) {
    Object.keys(options).forEach(key => {
      if (key !== 'id' && key !== 'position' && key in ast) {
        (ast as any)[key] = options[key]
      }
    })
  }

  // 编译节点以生成 metadata
  const compiledAst = compiler.compile(ast) as T

  return compiledAst
}

/**
 * 批量创建并编译节点
 *
 * @param nodes 节点类和配置的数组
 * @returns 编译后的节点数组
 */
export function createCompiledNodes(
  nodes: Array<{
    NodeClass: Type<any>
    options?: Parameters<typeof createCompiledNode>[1]
  }>
): INode[] {
  return nodes.map(({ NodeClass, options }) => createCompiledNode(NodeClass, options))
}
