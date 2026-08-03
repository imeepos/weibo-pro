import { Injectable, root } from '@sker/core';
import { WorkflowGraphAst, INode, getToolMethods, findNodeType } from '@sker/workflow';
import { ChapterData, StoryWeaverAst } from '@sker/workflow-ast';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { StructuredToolInterface } from '@langchain/core/tools';
import { buildChapterTools } from './story-chapter-tools';

/**
 * 故事工具工厂
 * 职责：创建 LangChain 工具（章节查询工具、搜索工具、节点工具、章节修订工具）
 *
 * 章节工具构建逻辑见 story-chapter-tools.ts；纯工具函数见 story-tools.util.ts。
 */
@Injectable()
export class StoryToolsFactory {
  /**
   * 创建章节工具（查询、搜索、修订）
   * @param chapters 章节列表（向后兼容，实际使用 ast）
   * @param ast 故事AST，用于修订章节时更新状态
   */
  createChapterTools(chapters: ChapterData[], ast?: StoryWeaverAst): StructuredToolInterface[] {
    return buildChapterTools(chapters, ast);
  }

  createNodeTools(ctx: WorkflowGraphAst, currentAstId: string): StructuredToolInterface[] {
    const toolNodes = this.buildToolNodes(ctx, currentAstId);

    const tools: StructuredToolInterface[] = [];
    for (const node of toolNodes) {
      tools.push(...this.createNodeTool(node));
    }

    return tools;
  }

  /**
   * 构建可用的工具节点列表
   *
   * 规则：
   * 1. WorkflowGraphAst.toolNodeIds 中指定的节点（无需连线）
   * 2. 当前节点之前所有运行成功的节点（state === 'success'）
   */
  private buildToolNodes(ctx: WorkflowGraphAst, currentAstId: string): INode[] {
    const toolNodeIds = new Set(ctx.toolNodeIds || []);
    const currentNodeIndex = ctx.nodes.findIndex(n => n.id === currentAstId);

    return ctx.nodes.filter((node, index) => {
      if (toolNodeIds.has(node.id)) return true;
      if (index < currentNodeIndex && node.state === 'success') return true;
      return false;
    });
  }

  private createNodeTool(node: INode): StructuredToolInterface[] {
    const nodeType = findNodeType(node.type);
    if (!nodeType) {
      return [];
    }

    const toolMethods = getToolMethods(nodeType);
    if (toolMethods.length === 0) {
      return [];
    }

    const tools: StructuredToolInterface[] = [];

    for (const toolMethod of toolMethods) {
      try {
        const toolInstance = root.get(toolMethod.target);
        const methodName = String(toolMethod.property);

        const langchainTool = tool(
          async () => {
            const result = toolInstance[methodName](node);
            return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
          },
          {
            name: `get_${node.type}_${node.id}_${methodName}`,
            description: `获取节点"${node.name || node.id}"的${methodName}内容${node.description ? `（${node.description}）` : ''}`,
            schema: z.object({})
          }
        );

        tools.push(langchainTool);
      } catch (error) {
        console.error(`[StoryToolsFactory] 创建节点 ${node.id} 的工具失败:`, error);
      }
    }

    return tools;
  }
}
