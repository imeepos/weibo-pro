import { Injectable, root } from '@sker/core';
import { WorkflowGraphAst, INode, getToolMethods, findNodeType } from '@sker/workflow';
import { ChapterData } from '@sker/workflow-ast';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * 故事工具工厂
 * 职责：创建 LangChain 工具（章节查询工具、搜索工具、节点工具）
 */
@Injectable()
export class StoryToolsFactory {
  createChapterTools(chapters: ChapterData[]): any[] {
    const listChaptersTool = tool(
      async () => {
        console.log('call tool listChaptersTool');
        return JSON.stringify(
          chapters.map(ch => ({
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            summary: ch.summary
          })),
          null,
          2
        );
      },
      {
        name: 'list_chapters',
        description: '列出所有已创作章节的标题和简介',
        schema: z.object({})
      }
    );

    const retrieveChapterTool = tool(
      async ({ chapterNumber }: { chapterNumber: number }) => {
        console.log(`call tool retrieveChapterTool ${chapterNumber}`);
        const chapter = chapters.find(c => c.chapterNumber === chapterNumber);
        if (!chapter) {
          return `章节 ${chapterNumber} 不存在`;
        }
        return JSON.stringify(chapter, null, 2);
      },
      {
        name: 'retrieve_chapter',
        description: '检索特定章节的完整内容（包括标题、简介、正文）',
        schema: z.object({
          chapterNumber: z.number().describe('章节号')
        })
      }
    );

    const searchContentTool = tool(
      async ({ pattern, mode }: { pattern: string; mode?: 'literal' | 'regex' | 'glob' }) => {
        console.log(`call tool searchContentTool pattern=${pattern} mode=${mode || 'literal'}`);

        const searchMode = mode || 'literal';
        const matcher = this.createMatcher(pattern, searchMode);

        const results = chapters
          .map(ch => {
            const contentMatch = matcher(ch.content);
            const titleMatch = matcher(ch.title);
            const summaryMatch = matcher(ch.summary);

            const matched = contentMatch.matched || titleMatch.matched || summaryMatch.matched;

            if (!matched) return null;

            return {
              chapterNumber: ch.chapterNumber,
              title: ch.title,
              matchCount: (contentMatch.matches?.length || 0) + (titleMatch.matches?.length || 0) + (summaryMatch.matches?.length || 0),
              matchLocations: {
                title: titleMatch.matched ? titleMatch.matches?.map(m => m[0]) : [],
                summary: summaryMatch.matched ? summaryMatch.matches?.map(m => m[0]) : [],
                content: contentMatch.matched ? contentMatch.matches?.slice(0, 5).map(m => m[0]) : []
              },
              matchContext: this.extractContextForMatches(ch.content, contentMatch.matches || [])
            };
          })
          .filter(r => r !== null);

        if (results.length === 0) {
          return `未找到匹配模式 "${pattern}" (${searchMode} 模式) 的内容`;
        }

        return JSON.stringify(results, null, 2);
      },
      {
        name: 'search_content',
        description: '在前文所有章节中搜索内容，支持多种模式：literal（字面量）、regex（正则表达式）、glob（通配符）',
        schema: z.object({
          pattern: z.string().describe('搜索模式。literal: 字面量匹配；regex: 正则表达式（如 "师父.*青玉"）；glob: 通配符（如 "*师父*", "青玉?"）'),
          mode: z.enum(['literal', 'regex', 'glob']).optional().describe('搜索模式，默认为 literal')
        })
      }
    );

    return [listChaptersTool, retrieveChapterTool, searchContentTool];
  }

  createNodeTools(ctx: WorkflowGraphAst, currentAstId: string): any[] {
    const toolNodes = this.buildToolNodes(ctx, currentAstId);

    if (toolNodes.length > 0) {
      console.log(`[StoryToolsFactory] 构建工具节点池，共 ${toolNodes.length} 个节点`);
    }

    const tools: any[] = [];
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

  private createNodeTool(node: INode): any[] {
    const nodeType = findNodeType(node.type);
    if (!nodeType) {
      console.log(`[StoryToolsFactory] 节点类型 ${node.type} 未注册，跳过`);
      return [];
    }

    const toolMethods = getToolMethods(nodeType);
    if (toolMethods.length === 0) {
      return [];
    }

    console.log(`[StoryToolsFactory] 节点 ${node.id} (${node.type}) 有 ${toolMethods.length} 个工具方法`);

    const tools: any[] = [];

    for (const toolMethod of toolMethods) {
      try {
        const toolInstance = root.get(toolMethod.target);
        const methodName = String(toolMethod.property);

        const langchainTool = tool(
          async () => {
            console.log(`[Tool] 调用 ${node.type}.${methodName}() nodeId=${node.id}`);
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

  private createMatcher(pattern: string, mode: string): (text: string) => { matched: boolean; matches?: RegExpMatchArray[] } {
    try {
      if (mode === 'regex') {
        const regex = new RegExp(pattern, 'gi');
        return (text: string) => {
          const matches = Array.from(text.matchAll(new RegExp(pattern, 'gi')));
          return { matched: matches.length > 0, matches };
        };
      }

      if (mode === 'glob') {
        const regexPattern = pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        const regex = new RegExp(regexPattern, 'gi');
        return (text: string) => {
          const matches = Array.from(text.matchAll(regex));
          return { matched: matches.length > 0, matches };
        };
      }

      // literal
      return (text: string) => {
        const index = text.indexOf(pattern);
        return {
          matched: index !== -1,
          matches: index !== -1 ? [{ 0: pattern, index, input: text }] as any : undefined
        };
      };
    } catch (error: any) {
      throw new Error(`搜索失败：${error.message}`);
    }
  }

  private extractContextForMatches(text: string, matches: RegExpMatchArray[], contextLength: number = 100): string[] {
    if (!matches || matches.length === 0) return [];

    return matches.slice(0, 3).map(match => {
      const index = match.index || 0;
      const matchText = match[0];
      const start = Math.max(0, index - contextLength);
      const end = Math.min(text.length, index + matchText.length + contextLength);

      return `...${text.substring(start, end)}...`;
    });
  }
}
