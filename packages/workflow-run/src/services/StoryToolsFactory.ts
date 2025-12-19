import { Injectable, root } from '@sker/core';
import { WorkflowGraphAst, INode, getToolMethods, findNodeType } from '@sker/workflow';
import { ChapterData } from '@sker/workflow-ast';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { StructuredToolInterface } from '@langchain/core/tools';

/**
 * 故事工具工厂
 * 职责：创建 LangChain 工具（章节查询工具、搜索工具、节点工具）
 */
@Injectable()
export class StoryToolsFactory {
  createChapterTools(chapters: ChapterData[]): StructuredToolInterface[] {
    const listChaptersTool = tool(
      async () => {
        if (chapters.length === 0) {
          return '暂无已创作章节';
        }
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
      async ({ chapterNumbers }: { chapterNumbers: number[] }) => {
        if (!chapterNumbers || chapterNumbers.length === 0) {
          return '请提供至少一个章节号';
        }

        const results = chapterNumbers.map(chapterNumber => {
          const chapter = chapters.find(c => c.chapterNumber === chapterNumber);
          if (!chapter) {
            return {
              chapterNumber,
              error: `章节 ${chapterNumber} 不存在`
            };
          }

          // 智能截断正文：头（300字）+ 中间（200字）+ 尾（300字）
          const content = this.truncateContent(chapter.content);

          return {
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            summary: chapter.summary,
            content,
            contentLength: chapter.content.length,
            clues: chapter.clues,
            resolvedClueIds: chapter.resolvedClueIds
          };
        });

        // 如果只查询一个章节，返回单个对象（向后兼容）
        if (results.length === 1) {
          return JSON.stringify(results[0], null, 2);
        }

        // 批量查询，返回数组
        return JSON.stringify(results, null, 2);
      },
      {
        name: 'retrieve_chapter',
        description: '批量检索章节的摘要内容（头+中间+尾采样，避免上下文过长）。可以一次性获取多个章节，提高效率。',
        schema: z.object({
          chapterNumbers: z.array(z.number()).describe('章节号数组，例如 [1, 2, 3] 表示获取第1、2、3章')
        })
      }
    );

    const searchContentTool = tool(
      async ({ pattern, mode }: { pattern: string; mode?: 'literal' | 'regex' | 'glob' }) => {
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

  /**
   * 智能截断内容：头 + 中间 + 尾
   * 策略：头部300字 + 中间200字 + 尾部300字，避免上下文过长
   */
  private truncateContent(content: string): string {
    const headLength = 300;
    const middleLength = 200;
    const tailLength = 300;
    const minLength = headLength + middleLength + tailLength;

    // 如果内容本身很短，直接返回
    if (content.length <= minLength) {
      return content;
    }

    // 截取头部
    const head = content.substring(0, headLength);

    // 截取中间（从正中间位置）
    const middleStart = Math.floor((content.length - middleLength) / 2);
    const middle = content.substring(middleStart, middleStart + middleLength);

    // 截取尾部
    const tail = content.substring(content.length - tailLength);

    // 计算省略的字数
    const omittedBefore = middleStart - headLength;
    const omittedAfter = content.length - tailLength - (middleStart + middleLength);

    return `${head}\n\n...【省略 ${omittedBefore} 字】...\n\n${middle}\n\n...【省略 ${omittedAfter} 字】...\n\n${tail}`;
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
          matches: index !== -1 ? [Object.assign([pattern], { index, input: text })] as any : undefined
        };
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`搜索失败：${message}`);
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
