/**
 * Markdown树构建模块
 *
 * 将扁平的节点列表构建为树形结构，并提供token计数和树剪枝功能
 */

import { countTokens } from '../utils/token.js';
import { structureToList } from '../utils/tree.js';
import type { Node } from '../types/node.types.js';

/**
 * 从节点列表构建树结构
 *
 * 将扁平化的节点列表转换为嵌套的树形结构
 * 使用栈来跟踪当前路径，确保正确的父子关系
 *
 * @param nodeList - 包含title, line_num, level, text的扁平节点列表
 * @returns 嵌套的树结构，根节点数组
 *
 * @example
 * ```ts
 * const nodeList = [
 *   { title: 'Chapter 1', line_num: 1, level: 1, text: '' },
 *   { title: 'Section 1.1', line_num: 5, level: 2, text: '' },
 *   { title: 'Chapter 2', line_num: 10, level: 1, text: '' },
 * ];
 * const tree = buildTreeFromNodes(nodeList);
 * // tree[0].nodes[0].title === 'Section 1.1'
 * ```
 */
export function buildTreeFromNodes(
  nodeList: Array<{title: string, line_num: number, level: number, text: string}>
): Node[] {
  const rootNodes: Node[] = [];
  const stack: Node[] = [];

  for (const item of nodeList) {
    const node: Node = {
      title: item.title,
      line_num: item.line_num,
      level: item.level,
      text: item.text,
      nodes: [],
    };

    // 弹出栈顶，直到找到父节点（级别 < 当前节点级别）
    while (stack.length > 0) {
      const stackTop = stack[stack.length - 1];
      if (stackTop && (stackTop.level || 0) >= item.level) {
        stack.pop();
      } else {
        break;
      }
    }

    // 添加到父节点或根节点
    const parentNode = stack[stack.length - 1];
    if (parentNode) {
      // 有父节点，添加为子节点
      parentNode.nodes!.push(node);
    } else {
      // 没有父节点，作为根节点
      rootNodes.push(node);
    }

    // 将当前节点压入栈
    stack.push(node);
  }

  return rootNodes;
}

/**
 * 更新节点的token计数（父节点包含所有子节点）
 *
 * 深度优先遍历树，计算每个节点的token数
 * 父节点的token数 = 自身文本token数 + 所有子节点的token数
 *
 * @param nodeList - 树形节点数组
 * @param model - 模型名称，用于token计数
 * @returns 更新后的节点数组（每个节点都有text_token_count）
 *
 * @example
 * ```ts
 * const tree: Node[] = [
 *   {
 *     title: 'Parent',
 *     text: 'Parent content',
 *     nodes: [
 *       { title: 'Child', text: 'Child content' }
 *     ]
 *   }
 * ];
 * const updated = updateNodeListWithTextTokenCount(tree, 'gpt-4o');
 * // updated[0].text_token_count >= updated[0].nodes[0].text_token_count
 * ```
 */
export function updateNodeListWithTextTokenCount(
  nodeList: Node[],
  model: string
): Node[] {
  // 扁平化列表，从后向前处理（确保子节点先处理）
  const flatList = structureToList(nodeList);

  // 从后向前遍历（子节点在前，父节点在后）
  for (let i = flatList.length - 1; i >= 0; i--) {
    const node = flatList[i];
    if (!node) continue;

    // 计算自己的token数
    let totalTokens = node.text ? countTokens(node.text, model) : 0;

    // 加上所有子节点的token数
    if (node.nodes && node.nodes.length > 0) {
      for (const child of node.nodes) {
        totalTokens += child.text_token_count || 0;
      }
    }

    node.text_token_count = totalTokens;
  }

  return nodeList;
}

/**
 * 树剪枝 - 合并过小的节点到父节点
 *
 * 从后向前遍历，对于token数小于阈值的节点：
 * - 如果有子节点，将子节点的文本合并到父节点
 * - 移除已被合并的子节点
 *
 * 目的：避免节点过碎，提高索引质量
 *
 * @param nodeList - 树形节点数组
 * @param minNodeToken - 最小token数阈值
 * @param model - 模型名称，用于token计数
 * @returns 剪枝后的树形结构（保持树形，不是扁平列表）
 *
 * @example
 * ```ts
 * const tree: Node[] = [
 *   {
 *     title: 'Parent',
 *     text: 'Short',
 *     text_token_count: 100,
 *     nodes: [
 *       { title: 'Child', text: 'Also short', text_token_count: 50 }
 *     ]
 *   }
 * ];
 * const thinned = treeThinningForIndex(tree, 500, 'gpt-4o');
 * // thinned[0].text 包含合并后的文本
 * ```
 */
export function treeThinningForIndex(
  nodeList: Node[],
  minNodeToken: number,
  model: string
): Node[] {
  // 扁平化列表，用于处理
  const flatList = structureToList(nodeList);

  // 从后向前遍历（子节点先处理）
  for (let i = flatList.length - 1; i >= 0; i--) {
    const node = flatList[i];
    if (!node) continue;

    // 如果节点token数小于阈值
    if (!node.text_token_count || node.text_token_count < minNodeToken) {
      // 如果有子节点，合并子节点文本
      if (node.nodes && node.nodes.length > 0) {
        const childrenText = node.nodes
          .map(child => child.text || '')
          .join('\n\n');

        // 将子节点文本合并到父节点
        node.text = (node.text || '') + '\n\n' + childrenText;

        // 清空子节点列表
        node.nodes = [];

        // 重新计算token数
        node.text_token_count = countTokens(node.text || '', model);
      }
    }
  }

  // 返回树形结构（不是扁平列表）
  return nodeList;
}
