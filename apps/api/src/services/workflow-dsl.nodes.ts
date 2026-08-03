import { getAllNodeTypes, findNodeType, NODE } from '@sker/workflow';
import { root } from '@sker/core';

export type NodeCategory = 'data-sources' | 'ai-capabilities' | 'data-processing' | 'all';

/**
 * 列出所有可用的节点类型。
 */
export function listAvailableNodes(
  category: NodeCategory = 'all'
): Array<{ name: string; title: string; type: string; description: string }> {
  const allNodes = getAllNodeTypes();

  const filtered =
    category === 'all'
      ? allNodes
      : allNodes.filter(node => {
          const name = node.name.toLowerCase();
          if (category === 'data-sources')
            return name.includes('login') || name.includes('search') || name.includes('http');
          if (category === 'ai-capabilities')
            return name.includes('llm') || name.includes('agent') || name.includes('generator');
          if (category === 'data-processing')
            return (
              name.includes('analyzer') || name.includes('filter') || name.includes('transform')
            );
          return true;
        });

  return filtered.map((node: any) => {
    const metadata = root.get(NODE, []).find((m: any) => m.target === node);
    return {
      name: node.name,
      title: metadata?.title || node.name,
      type: metadata?.type || 'unknown',
      description: '无描述',
    };
  });
}

/**
 * 获取指定节点的 Schema。
 */
export function getNodeSchema(nodeType: string): {
  name: string;
  title: string;
  description: string;
  inputs: Array<{ name: string; type: string; required: boolean; description: string }>;
  outputs: Array<{ name: string; type: string; description: string }>;
} {
  const NodeClass = findNodeType(nodeType);

  if (!NodeClass) {
    throw new Error(`未找到节点类型: ${nodeType}`);
  }

  const _instance = new NodeClass();
  const metadata = root.get(NODE, []).find((m: any) => m.target === NodeClass);
  const inputs = Reflect.getMetadata('node:inputs', NodeClass.prototype) || [];
  const outputs = Reflect.getMetadata('node:outputs', NodeClass.prototype) || [];

  return {
    name: nodeType,
    title: metadata?.title || nodeType,
    description: '无描述',
    inputs: inputs.map((input: any) => ({
      name: input.propertyKey,
      type: input.type || 'any',
      required: input.required !== false,
      description: input.description || '',
    })),
    outputs: outputs.map((output: any) => ({
      name: output.propertyKey,
      type: output.type || 'any',
      description: output.description || '',
    })),
  };
}
