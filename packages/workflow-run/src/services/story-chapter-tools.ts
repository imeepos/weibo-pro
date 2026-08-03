/**
 * 章节工具构建器
 *
 * 从 StoryToolsFactory.createChapterTools 抽取的工具创建逻辑：
 * - list_chapters：列出所有已创作章节
 * - retrieve_chapter：批量检索章节摘要内容
 * - search_content：多模式搜索章节内容
 * - revise_chapter（可选）：修订已有章节
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { StructuredToolInterface } from '@langchain/core/tools';
import { ChapterData, StoryWeaverAst } from '@sker/workflow-ast';
import { truncateContent, createMatcher, extractContextForMatches } from './story-tools.util';

/**
 * 创建章节工具（查询、搜索、修订）
 * @param chapters 章节列表（向后兼容，实际使用 ast）
 * @param ast 故事AST，用于修订章节时更新状态
 */
export function buildChapterTools(chapters: ChapterData[], ast?: StoryWeaverAst): StructuredToolInterface[] {
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
        const content = truncateContent(chapter.content);

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
      const matcher = createMatcher(pattern, searchMode);

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
            matchContext: extractContextForMatches(ch.content, contentMatch.matches || [])
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

  // 章节修订工具（仅在提供 AST 时可用）
  const tools: StructuredToolInterface[] = [listChaptersTool, retrieveChapterTool, searchContentTool];

  if (ast) {
    const reviseChapterTool = tool(
      async ({ chapterNumber, revisions, reason }: {
        chapterNumber: number;
        revisions: {
          title?: string;
          summary?: string;
          content?: string;
        };
        reason: string;
      }) => {
        // 查找要修订的章节
        const chapterIndex = chapters.findIndex(ch => ch.chapterNumber === chapterNumber);

        if (chapterIndex === -1) {
          return JSON.stringify({
            success: false,
            error: `章节 ${chapterNumber} 不存在，无法修订`
          });
        }

        const originalChapter = chapters[chapterIndex] as ChapterData;

        // 应用修订（只更新提供的字段）
        const revisedChapter: ChapterData = {
          ...originalChapter,
          ...(revisions.title && { title: revisions.title }),
          ...(revisions.summary && { summary: revisions.summary }),
          ...(revisions.content && { content: revisions.content })
        };

        // 更新 AST 中的章节（不可变更新）
        ast.previousChapters = [
          ...ast.previousChapters.slice(0, chapterIndex),
          revisedChapter,
          ...ast.previousChapters.slice(chapterIndex + 1)
        ];

        // 同时更新传入的 chapters 数组（保持引用一致性）
        chapters.splice(chapterIndex, 1, revisedChapter);

        console.log(`[revise_chapter] 修订第 ${chapterNumber} 章`);
        console.log(`[revise_chapter] 修订原因: ${reason}`);
        console.log(`[revise_chapter] 修订内容: ${Object.keys(revisions).join(', ')}`);

        return JSON.stringify({
          success: true,
          chapterNumber,
          revisedFields: Object.keys(revisions),
          reason,
          message: `第 ${chapterNumber} 章《${revisedChapter.title}》已修订完成`
        }, null, 2);
      },
      {
        name: 'revise_chapter',
        description: `修订已有章节，用于解决剧情矛盾、设定冲突、逻辑错误等问题。

⚠️ 使用场景：
- 发现当前章节与之前章节存在矛盾（人物设定、时间线、因果关系等）
- 前文逻辑不自洽，需要修正
- 需要为当前章节铺垫伏笔，需要在前文埋下线索

⚠️ 使用约束：
- 优先修订最近的章节（修改影响最小）
- 说明修订理由（reason 字段必填）
- 只修订必要的字段（不需要修改的字段不要传）
- 修订后不需要重新生成后续章节，继续创作当前章节即可`,
        schema: z.object({
          chapterNumber: z.number().describe('要修订的章节号'),
          revisions: z.object({
            title: z.string().optional().describe('新的章节标题（可选）'),
            summary: z.string().optional().describe('新的章节简介（可选）'),
            content: z.string().optional().describe('新的章节正文（可选）')
          }).describe('要修订的字段（只提供需要修改的字段）'),
          reason: z.string().describe('修订原因（必填，说明为什么要修订，解决了什么矛盾）')
        })
      }
    );

    tools.push(reviseChapterTool);
  }

  return tools;
}
