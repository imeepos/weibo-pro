/**
 * 树结构操作工具函数
 *
 * 提供对文档树结构的遍历、查询和修改功能
 */

import type { Node } from '../types/node.types.js';

/**
 * 将嵌套树结构扁平化为列表
 *
 * 深度优先遍历树结构,将所有节点按遍历顺序放入一维数组
 *
 * @param structure - 嵌套的节点树
 * @returns 扁平化的节点列表
 *
 * @example
 * ```ts
 * const tree: Node[] = [
 *   {
 *     title: 'Chapter 1',
 *     nodes: [{ title: 'Section 1.1' }]
 *   }
 * ];
 * const list = structureToList(tree);
 * // returns: [
 * //   { title: 'Chapter 1', nodes: [...] },
 * //   { title: 'Section 1.1' }
 * // ]
 * ```
 */
export function structureToList(structure: Node[]): Node[] {
  const result: Node[] = [];

  function traverse(nodes: Node[]) {
    for (const node of nodes) {
      result.push(node);
      if (node.nodes && node.nodes.length > 0) {
        traverse(node.nodes);
      }
    }
  }

  traverse(structure);
  return result;
}

/**
 * 获取所有叶子节点(无子节点的节点)
 *
 * 叶子节点是指nodes字段为undefined、null或空数组的节点
 *
 * @param structure - 嵌套的节点树
 * @returns 所有叶子节点的列表
 *
 * @example
 * ```ts
 * const tree: Node[] = [
 *   {
 *     title: 'Parent',
 *     nodes: [
 *       { title: 'Child 1' },
 *       { title: 'Child 2' }
 *     ]
 *   }
 * ];
 * const leaves = getLeafNodes(tree);
 * // returns: [
 * //   { title: 'Child 1' },
 *   { title: 'Child 2' }
 * // ]
 * ```
 */
export function getLeafNodes(structure: Node[]): Node[] {
  const result: Node[] = [];

  function traverse(nodes: Node[]) {
    for (const node of nodes) {
      if (!node.nodes || node.nodes.length === 0) {
        result.push(node);
      } else {
        traverse(node.nodes);
      }
    }
  }

  traverse(structure);
  return result;
}

/**
 * 为树中每个节点添加唯一ID
 *
 * 深度优先遍历树,为每个节点分配一个递增的4位数字字符串ID
 * 格式为'0001', '0002', '0003', ...
 *
 * @param data - 节点数组
 * @param nodeId - 起始ID,默认为0
 * @returns 下一个可用的ID
 *
 * @example
 * ```ts
 * const tree: Node[] = [
 *   { title: 'Node 1' },
 *   { title: 'Node 2' }
 * ];
 * const nextId = writeNodeId(tree);
 * // tree[0].node_id === '0001'
 * // tree[1].node_id === '0002'
 * // nextId === 3
 * ```
 */
export function writeNodeId(data: Node[], nodeId: number = 0): number {
  for (const node of data) {
    nodeId++;
    node.node_id = nodeId.toString().padStart(4, '0');

    if (node.nodes && node.nodes.length > 0) {
      // 递归调用返回下一个可用的ID
      nodeId = writeNodeId(node.nodes, nodeId) - 1;
    }
  }

  // 返回下一个可用的ID(当前最大ID + 1)
  return nodeId + 1;
}

/**
 * 获取所有节点(扁平化)
 *
 * 这是structureToList的别名,提供更语义化的命名
 *
 * @param structure - 嵌套的节点树
 * @returns 扁平化的节点列表
 *
 * @example
 * ```ts
 * const tree: Node[] = [{ title: 'Root', nodes: [{ title: 'Child' }] }];
 * const nodes = getNodes(tree);
 * // returns: [
 * //   { title: 'Root', nodes: [...] },
 * //   { title: 'Child' }
 * // ]
 * ```
 */
export function getNodes(structure: Node[]): Node[] {
  return structureToList(structure);
}

/**
 * 检查指定节点是否为叶子节点
 *
 * 叶子节点是指没有子节点的节点(nodes为undefined、null或空数组)
 *
 * @param data - 节点数组
 * @param nodeId - 要检查的节点ID
 * @returns 如果是叶子节点返回true,否则返回false
 *
 * @example
 * ```ts
 * const tree: Node[] = [
 *   {
 *     title: 'Parent',
 *     node_id: '0001',
 *     nodes: [{ title: 'Child', node_id: '0002' }]
 *   }
 * ];
 * isLeafNode(tree, '0002'); // returns: true
 * isLeafNode(tree, '0001'); // returns: false
 * ```
 */
export function isLeafNode(data: Node[], nodeId: string): boolean {
  const nodes = structureToList(data);
  const targetNode = nodes.find(n => n.node_id === nodeId);

  if (!targetNode) {
    return false;
  }

  return !targetNode.nodes || targetNode.nodes.length === 0;
}
