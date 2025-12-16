import { Injectable } from '@sker/core';
import { Handler, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { ChapterData, StoryWeaverAst } from '@sker/workflow-ast';
import { Observable, from } from 'rxjs';
import { concatMap, mergeMap } from 'rxjs/operators';
import { useLlmModel } from './llm-client';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

@Injectable()
export class StoryWeaverAstVisitor {
  @Handler(StoryWeaverAst)
  visit(ast: StoryWeaverAst, input$: Observable<any>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
    return new Observable<NodeEvent>((obs) => {
      const abortController = new AbortController();

      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id, data: ast });

      const subscription = input$.pipe(
        concatMap(async (inputData) => {
          ast.emitCount += 1;
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as any)[key] = inputData[key];
            });
          }

          if (abortController.signal.aborted) {
            throw new Error('工作流已取消');
          }

          // previousChapters 是内部状态，会自动累积（stateful 节点）
          // 过滤掉空章节（避免空章节污染前文回顾）
          const chapters = (ast.previousChapters || []).filter(ch => ch.content && ch.content.trim().length > 0);
          const isFirstChapter = chapters.length === 0;
          const nextChapterNumber = isFirstChapter ? 1 : Math.max(...chapters.map(c => c.chapterNumber)) + 1;

          // 不使用工具，直接在提示词中包含前文章节信息
          const model = useLlmModel({ model: ast.model, temperature: ast.temperature });

          const systemPrompt = this.buildSystemPrompt(ast, chapters, isFirstChapter, nextChapterNumber);
          const prompts = Array.isArray(ast.prompt) ? ast.prompt.join('\n') : ast.prompt;

          const userPrompt = `请创作第 ${nextChapterNumber} 章。\n\n**创作要求**：\n${prompts}`;

          const result = await model.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'human', content: userPrompt }
          ]);

          const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
          const parsed = this.parseChapterContent(content);

          const chapterData: ChapterData = {
            chapterNumber: nextChapterNumber,
            title: parsed.title,
            summary: parsed.summary,
            content: parsed.content
          };

          // 自动累积章节到内部状态（stateful 保证下次运行时保留）
          // 检查是否已存在相同章节号，如果存在则更新，否则添加
          const existingIndex = ast.previousChapters.findIndex(ch => ch.chapterNumber === nextChapterNumber);
          if (existingIndex >= 0) {
            ast.previousChapters[existingIndex] = chapterData;
          } else {
            ast.previousChapters.push(chapterData);
          }

          ast.title = chapterData.title;
          ast.summary = chapterData.summary;
          ast.content = chapterData.content;
          ast.chapterNumber = chapterData.chapterNumber;
          ast.chapterData = chapterData;

          return [
            { type: 'node_emit' as const, id: ast.id, property: 'title', value: chapterData.title },
            { type: 'node_emit' as const, id: ast.id, property: 'summary', value: chapterData.summary },
            { type: 'node_emit' as const, id: ast.id, property: 'content', value: chapterData.content },
            { type: 'node_emit' as const, id: ast.id, property: 'chapterNumber', value: chapterData.chapterNumber },
            { type: 'node_emit' as const, id: ast.id, property: 'chapterData', value: chapterData }
          ];
        }),
        mergeMap((events: NodeEvent[]) => from(events))
      ).subscribe({
        next: (event: NodeEvent) => {
          obs.next(event);
        },
        error: (error) => {
          ast.state = 'fail';
          setAstError(ast, error);
          obs.next({ type: 'node_fail', id: ast.id, data: ast });
          obs.complete();
        },
        complete: () => {
          ast.state = 'success';
          obs.next({ type: 'node_success', id: ast.id, data: ast });
          obs.complete();
        }
      });

      return () => {
        console.log('[StoryWeaverAstVisitor] 订阅被取消，触发 AbortSignal');
        subscription.unsubscribe();
        abortController.abort();
        obs.complete();
      };
    });
  }

  // 工具方法：以下工具方法暂不使用，保留供将来长篇小说场景使用
  // 对于短篇小说，直接在提示词中包含前文章节信息更简单可靠
  private createStoryTools(chapters: ChapterData[]) {
    const listChaptersTool = tool(
      async () => {
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
      async ({ keyword }: { keyword: string }) => {
        const results = chapters
          .filter(ch => ch.content.includes(keyword) || ch.title.includes(keyword) || ch.summary.includes(keyword))
          .map(ch => ({
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            matchContext: this.extractContext(ch.content, keyword)
          }));

        if (results.length === 0) {
          return `未在前文中找到关键词"${keyword}"`;
        }

        return JSON.stringify(results, null, 2);
      },
      {
        name: 'search_content',
        description: '在前文所有章节中搜索关键词，返回匹配的章节和上下文',
        schema: z.object({
          keyword: z.string().describe('要搜索的关键词')
        })
      }
    );

    return [listChaptersTool, retrieveChapterTool, searchContentTool];
  }

  private buildSystemPrompt(ast: StoryWeaverAst, chapters: ChapterData[], isFirstChapter: boolean, chapterNumber: number): string {
    const basePrompt = `你是一位资深小说家，正在创作一部小说的第 ${chapterNumber} 章。

**写作要求**：
- 风格：${ast.style}
- 本章字数：约 ${ast.wordCount} 字
- 注重情节张力与人物刻画
- 语言优美流畅，富有画面感

**输出格式**：
\`\`\`
# 章节标题

【简介】
一句话概括本章核心情节

【正文】
章节正文内容...
\`\`\`
`;

    if (isFirstChapter) {
      return basePrompt + '\n这是第一章，请设定故事背景、引入主要人物。';
    }

    // 构建前文章节信息
    const previousContext = chapters.map(ch => {
      return `## 第 ${ch.chapterNumber} 章：${ch.title}

**简介**：${ch.summary}

**正文节选**（前500字）：
${ch.content.substring(0, 500)}${ch.content.length > 500 ? '...' : ''}
`;
    }).join('\n\n');

    return basePrompt + `

**前文章节回顾**：
${previousContext}

**续写要点**：
- 保持前文风格与人物设定
- 情节自然衔接，推动故事发展
- 可引入新冲突或转折
- 注意与前文的连贯性`;
  }

  private parseChapterContent(content: string): { title: string; summary: string; content: string } {
    const titleMatch = content.match(/^#\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1]!.trim() : '未命名';

    const summaryMatch = content.match(/【简介】\s*\n(.+?)(?=\n|【正文】)/s);
    const summary = summaryMatch ? summaryMatch[1]!.trim() : '';

    const contentMatch = content.match(/【正文】\s*\n([\s\S]+)/);
    const mainContent = contentMatch ? contentMatch[1]!.trim() : content;

    return { title, summary, content: mainContent };
  }

  private extractContext(text: string, keyword: string, contextLength: number = 100): string {
    const index = text.indexOf(keyword);
    if (index === -1) return '';

    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + keyword.length + contextLength);

    return `...${text.substring(start, end)}...`;
  }
}
