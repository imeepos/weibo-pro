import { logger } from '@sker/core';
import { resolveConstructor, type INodeOutputMetadata, type INode, type WorkflowGraphAst } from '@sker/workflow';

/**
 * 提取节点输出 - 基于 @Output 装饰器元数据
 *
 * 优雅设计：
 * - 只提取 @Output 装饰的属性
 * - 通过元数据确保输出结构的明确性
 * - 避免提取内部状态和配置属性
 */
export function extractNodeOutputs(node: INode): Record<string, unknown> {
  const outputs: Record<string, unknown> = {};

  try {
    // 获取节点的构造函数
    const _ctor = resolveConstructor(node);

    // ✨使用编译后的 node.metadata.outputs，不再依赖装饰器
    const nodeOutputs = node.metadata?.outputs || [];

    // 提取输出属性的值
    nodeOutputs.forEach((meta: INodeOutputMetadata) => {
      const propertyKey = meta.property as string;
      const value = node[propertyKey];

      if (value !== undefined) {
        outputs[propertyKey] = value;
      }
    });
  } catch (error) {
    logger.error('提取节点输出失败', {
      nodeId: node.id,
      nodeType: node.type,
      error: (error as Error).message
    });
  }

  return outputs;
}

/**
 * 提取工作流输出 - 只收集输出节点的结果
 *
 * 优雅设计：
 * - 找到所有没有后续连线的节点（出度为 0）
 * - 这些节点被视为工作流的输出节点
 * - 收集输出节点的 @Output 属性值
 * - 以节点 ID 为 key 组织输出
 */
export function extractWorkflowOutputs(ast: WorkflowGraphAst): Record<string, unknown> {
  const outputs: Record<string, unknown> = {};

  if (!ast.nodes || !ast.edges) {
    return outputs;
  }

  // 构建出度映射：记录每个节点有多少条出边
  const outDegree = new Map<string, number>();
  ast.nodes.forEach(node => outDegree.set(node.id, 0));

  ast.edges.forEach(edge => {
    const count = outDegree.get(edge.from) || 0;
    outDegree.set(edge.from, count + 1);
  });

  // 找到所有出度为 0 的节点（输出节点）
  const outputNodes = ast.nodes.filter(node => {
    const degree = outDegree.get(node.id) || 0;
    return degree === 0 && node.state === 'success';
  });

  // 收集输出节点的结果
  outputNodes.forEach(node => {
    const nodeOutputs = extractNodeOutputs(node);

    if (Object.keys(nodeOutputs).length > 0) {
      outputs[node.id] = {
        nodeType: node.type,
        nodeName: (node as { name?: string }).name || node.id,
        outputs: nodeOutputs
      };
    }
  });

  return outputs;
}
