/**
 * PDF文档树解析器
 *
 * 递归处理文档结构树,根据页数和token限制自动分割过大的节点
 */

import { isPDFConfig } from '../types/config.types.js';
import type { Node } from '../types/node.types.js';
import type { PageToken } from '../types/result.types.js';
import type { PDFConfig, Config } from '../types/config.types.js';

/**
 * 计算节点的页数
 */
function calculatePageCount(node: Node): number {
  if (node.start_index === undefined || node.end_index === undefined) {
    return 0;
  }
  return node.end_index - node.start_index + 1;
}

/**
 * 计算节点的token数
 */
function calculateNodeTokens(
  node: Node,
  pageList: PageToken[]
): number {
  if (node.start_index === undefined || node.end_index === undefined) {
    return 0;
  }

  let totalTokens = 0;
  for (let i = node.start_index; i <= node.end_index; i++) {
    const page = pageList[i - 1]; // 页码从1开始,数组从0开始
    if (page) {
      totalTokens += page.tokenCount;
    }
  }

  return totalTokens;
}

/**
 * 分割节点
 *
 * 将一个过大的节点分割成多个较小的节点
 *
 * @param node - 要分割的节点
 * @param pageList - 页面列表
 * @param config - PDF配置
 * @returns 分割后的节点数组
 */
function splitNode(
  node: Node,
  pageList: PageToken[],
  config: PDFConfig
): Node[] {
  const totalPages = calculatePageCount(node);
  const maxPages = config.maxPageNumEachNode;
  const maxTokens = config.maxTokenNumEachNode;

  // 计算总token数
  let totalTokens = 0;
  const startIndex = node.start_index || 1;
  const endIndex = node.end_index || totalPages;

  for (let i = startIndex; i <= endIndex; i++) {
    const page = pageList[i - 1];
    if (page) {
      totalTokens += page.tokenCount;
    }
  }

  // 计算需要分割成多少个节点(基于页数或token数)
  const numSplitsByPages = Math.ceil(totalPages / maxPages);
  const numSplitsByTokens = Math.ceil(totalTokens / maxTokens);
  const numSplits = Math.max(numSplitsByPages, numSplitsByTokens);

  const splits: Node[] = [];
  const pagesPerSplit = Math.ceil(totalPages / numSplits);

  for (let i = 0; i < numSplits; i++) {
    const splitStart = startIndex + i * pagesPerSplit;
    const splitEnd = Math.min(splitStart + pagesPerSplit - 1, endIndex);

    splits.push({
      ...node,
      start_index: splitStart,
      end_index: splitEnd,
      title: i === 0 ? node.title : `${node.title} (Part ${i + 1})`,
    });
  }

  return splits;
}

/**
 * 递归解析节点树
 *
 * 检查每个节点的页数和token数,超过限制则分割
 *
 * @param structure - 节点结构数组
 * @param pageList - 页面文本和token数列表
 * @param config - 配置对象
 * @param currentLevel - 当前层级(用于递归)
 * @returns 处理后的节点数组
 *
 * @example
 * ```ts
 * const structure = [
 *   { title: 'Chapter 1', start_index: 1, end_index: 5 }
 * ];
 * const pages = await getPageTokens('doc.pdf');
 * const result = await treeParser(structure, pages, config);
 * ```
 */
export async function treeParser(
  structure: Node[],
  pageList: PageToken[],
  config: Config,
  currentLevel?: number
): Promise<Node[]> {
  // 空数组直接返回
  if (!structure || structure.length === 0) {
    return [];
  }

  // 确保是PDF配置
  if (!isPDFConfig(config)) {
    return structure;
  }

  const result: Node[] = [];

  // 并发处理每个节点
  for (const node of structure) {
    let processedNodes: Node[] = [node];

    // 计算页数和token数
    const pageCount = calculatePageCount(node);
    const tokenCount = calculateNodeTokens(node, pageList);

    // 检查是否需要分割
    const needsSplit =
      pageCount > config.maxPageNumEachNode ||
      tokenCount > config.maxTokenNumEachNode;

    if (needsSplit) {
      processedNodes = splitNode(node, pageList, config);
    }

    // 递归处理子节点
    for (const processedNode of processedNodes) {
      if (processedNode.nodes && processedNode.nodes.length > 0) {
        processedNode.nodes = await treeParser(
          processedNode.nodes,
          pageList,
          config,
          (currentLevel || 0) + 1
        );
      }
      result.push(processedNode);
    }
  }

  return result;
}

/**
 * 处理元数据和树解析
 *
 * 这是treeParser的包装函数,提供更高级的接口
 *
 * @param structure - 节点结构数组
 * @param pageList - 页面文本和token数列表
 * @param config - 配置对象
 * @returns 处理后的节点数组
 *
 * @example
 * ```ts
 * const structure = [
 *   { title: 'Chapter 1', start_index: 1, end_index: 15 }
 * ];
 * const pages = await getPageTokens('doc.pdf');
 * const result = await metaProcessor(structure, pages, config);
 * // 返回分割后的节点树
 * ```
 */
export async function metaProcessor(
  structure: Node[],
  pageList: PageToken[],
  config: Config
): Promise<Node[]> {
  // 空数组直接返回
  if (!structure || structure.length === 0) {
    return [];
  }

  // 调用treeParser进行递归处理
  return await treeParser(structure, pageList, config);
}
