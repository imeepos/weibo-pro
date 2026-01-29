/**
 * Markdown索引主入口模块
 *
 * 提供完整的Markdown文档索引功能
 */

import { readFileSync } from 'fs';
import { ChatGPT_API_async } from '../utils/openai.js';
import { countTokens } from '../utils/token.js';
import { writeNodeId } from '../utils/tree.js';
import { extractNodesFromMarkdown, extractNodeTextContent } from './node-extractor.js';
import { buildTreeFromNodes, updateNodeListWithTextTokenCount, treeThinningForIndex } from './tree-builder.js';
import type { DocumentResult } from '../types/result.types.js';
import type { Node } from '../types/node.types.js';

/**
 * 获取节点摘要
 *
 * 如果文本较短（< summaryTokenThreshold），直接返回原文
 * 否则使用OpenAI API生成摘要
 *
 * @param node - 节点对象
 * @param summaryTokenThreshold - 摘要token阈值
 * @param model - OpenAI模型名称
 * @returns 节点摘要
 */
async function getNodeSummary(
  node: Node,
  summaryTokenThreshold: number,
  model: string
): Promise<string> {
  if (!node.text) return '';

  const tokens = countTokens(node.text, model);

  // 如果文本较短，直接返回
  if (tokens < summaryTokenThreshold) {
    return node.text;
  }

  // 否则生成摘要
  const prompt = `You are given a section of a document and your job is to write a concise summary of the given section.

Section title: ${node.title}
Section content: ${node.text}

Requirements:
1. Capture the main points
2. Keep it under ${summaryTokenThreshold} tokens
3. Use the same language as the original text

Summary:`;

  return await ChatGPT_API_async(model, prompt);
}

/**
 * 为所有节点生成摘要
 *
 * 为叶子节点生成内容摘要
 * 为父节点生成前缀摘要（基于子节点摘要）
 *
 * @param structure - 树形结构
 * @param summaryTokenThreshold - 摘要token阈值
 * @param model - OpenAI模型名称
 * @returns 更新后的树形结构
 */
async function generateSummariesForStructureMd(
  structure: Node[],
  summaryTokenThreshold: number,
  model: string
): Promise<Node[]> {
  // 获取所有叶子节点
  const leafNodes: Node[] = [];
  function collectLeaves(nodes: Node[]) {
    for (const node of nodes) {
      if (!node.nodes || node.nodes.length === 0) {
        leafNodes.push(node);
      } else {
        collectLeaves(node.nodes);
      }
    }
  }
  collectLeaves(structure);

  // 为叶子节点生成摘要
  for (const node of leafNodes) {
    const summary = await getNodeSummary(node, summaryTokenThreshold, model);
    node.summary = summary;
  }

  // 为父节点生成前缀摘要（基于子节点摘要）
  function addPrefixSummaries(nodes: Node[]) {
    for (const node of nodes) {
      if (node.nodes && node.nodes.length > 0) {
        // 先处理子节点
        addPrefixSummaries(node.nodes);

        // 生成前缀摘要（子节点摘要的连接）
        const childSummaries = node.nodes
          .map(child => child.summary || '')
          .filter(s => s)
          .join('; ');

        if (childSummaries) {
          node.prefix_summary = childSummaries;
        }
      }
    }
  }
  addPrefixSummaries(structure);

  return structure;
}

/**
 * Markdown索引主函数
 *
 * 完整处理Markdown文档，生成结构化索引
 *
 * @param mdPath - Markdown文件路径
 * @param ifThinning - 是否进行树剪枝
 * @param minTokenThreshold - 剪枝的最小token阈值
 * @param ifAddNodeSummary - 是否生成节点摘要
 * @param summaryTokenThreshold - 摘要token阈值
 * @param model - OpenAI模型名称
 * @param ifAddDocDescription - 是否生成文档描述（未实现）
 * @param ifAddNodeText - 是否保留节点文本
 * @param ifAddNodeId - 是否添加节点ID
 * @returns 文档索引结果
 *
 * @example
 * ```ts
 * const result = await md_to_tree(
 *   'document.md',
 *   false,  // ifThinning
 *   500,    // minTokenThreshold
 *   false,  // ifAddNodeSummary
 *   200,    // summaryTokenThreshold
 *   'gpt-4o',
 *   false,  // ifAddDocDescription
 *   false,  // ifAddNodeText
 *   true    // ifAddNodeId
 * );
 * console.log(result.structure);
 * ```
 */
export async function md_to_tree(
  mdPath: string,
  ifThinning: boolean,
  minTokenThreshold: number,
  ifAddNodeSummary: boolean,
  summaryTokenThreshold: number,
  model: string,
  ifAddDocDescription: boolean,
  ifAddNodeText: boolean,
  ifAddNodeId: boolean
): Promise<DocumentResult> {
  // 1. 读取Markdown文件
  const markdownContent = readFileSync(mdPath, 'utf-8');

  // 2. 提取标题
  const [nodes, lines] = extractNodesFromMarkdown(markdownContent);

  // 3. 提取内容
  const nodesWithText = extractNodeTextContent(nodes, lines);

  // 4. 构建树
  let structure = buildTreeFromNodes(nodesWithText);

  // 5. 更新token计数
  structure = updateNodeListWithTextTokenCount(structure, model);

  // 6. 树剪枝（可选）
  if (ifThinning) {
    structure = treeThinningForIndex(structure, minTokenThreshold, model);
  }

  // 7. 生成摘要（可选）
  if (ifAddNodeSummary) {
    structure = await generateSummariesForStructureMd(structure, summaryTokenThreshold, model);
  }

  // 8. 添加节点ID（可选）
  if (ifAddNodeId) {
    writeNodeId(structure);
  }

  // 9. 移除text（如果不保留）
  if (!ifAddNodeText) {
    function removeText(nodes: Node[]) {
      for (const node of nodes) {
        if (node.text !== undefined) {
          delete node.text;
        }
        if (node.nodes) {
          removeText(node.nodes);
        }
      }
    }
    removeText(structure);
  }

  // 10. 提取文档名称
  const docName = mdPath.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, '') || 'document';

  // 11. 构建返回结果
  const result: DocumentResult = {
    doc_name: docName,
    structure,
  };

  // 12. 添加文档描述（可选，未实现）
  if (ifAddDocDescription) {
    // TODO: 实现文档描述生成
    // result.doc_description = await generateDocDescription(structure, model);
  }

  return result;
}
