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

          // 提取已存在的章节标题（用于去重检查）
          const existingTitles = new Set(chapters.map(ch => this.normalizeTitle(ch.title)));

          // 不使用工具，直接在提示词中包含前文章节信息
          const model = useLlmModel({ model: ast.model, temperature: ast.temperature });

          const systemPrompt = this.buildSystemPrompt(ast, chapters, isFirstChapter, nextChapterNumber);
          const prompts = Array.isArray(ast.prompt) ? ast.prompt.join('\n') : ast.prompt;

          const userPrompt = `请创作第 ${nextChapterNumber} 章。\n\n**创作要求**：\n${prompts}`;

          // 重试机制：如果标题重复，最多重试 3 次
          let chapterData: ChapterData | null = null;
          let retryCount = 0;
          const maxRetries = 3;

          while (retryCount <= maxRetries) {
            if (abortController.signal.aborted) {
              throw new Error('工作流已取消');
            }

            const result = await model.invoke([
              { role: 'system', content: systemPrompt },
              { role: 'human', content: userPrompt }
            ]);

            const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
            const parsed = this.parseChapterContent(content);

            // 标准化标题并检查重复
            const normalizedTitle = this.normalizeTitle(parsed.title);

            if (!existingTitles.has(normalizedTitle)) {
              // 标题唯一，生成成功
              chapterData = {
                chapterNumber: nextChapterNumber,
                title: parsed.title,
                summary: parsed.summary,
                content: parsed.content
              };

              // 字数检查（可选，仅输出警告）
              const wordCount = parsed.content.length;
              const targetWordCount = ast.wordCount;
              const deviation = Math.abs(wordCount - targetWordCount) / targetWordCount;

              if (deviation > 0.3) {
                console.warn(`[StoryWeaver] 第${nextChapterNumber}章字数偏差较大：实际${wordCount}字，目标${targetWordCount}字（偏差${(deviation * 100).toFixed(1)}%）`);
              }

              break;
            } else {
              // 标题重复，重试
              retryCount++;
              console.warn(`[StoryWeaver] 第${nextChapterNumber}章标题重复："${parsed.title}"，正在重试（${retryCount}/${maxRetries}）`);

              if (retryCount <= maxRetries) {
                // 在用户提示词中追加去重要求
                const retryHint = `\n\n⚠️ 注意：刚才生成的标题"${parsed.title}"与已有章节重复，请重新构思一个完全不同的标题。`;
                const result = await model.invoke([
                  { role: 'system', content: systemPrompt },
                  { role: 'human', content: userPrompt + retryHint }
                ]);
              }
            }
          }

          if (!chapterData) {
            throw new Error(`第${nextChapterNumber}章生成失败：经过${maxRetries}次重试后，仍无法生成唯一的章节标题`);
          }

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
- 本章字数：严格控制在 ${ast.wordCount} 字左右（偏差不超过±20%）
- 注重情节张力与人物刻画
- 语言优美流畅，富有画面感
- 每章推进核心情节，避免原地踏步

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
      return basePrompt + '\n这是第一章，请设定故事背景、引入主要人物、埋下主要冲突线索。';
    }

    // 提取所有已有章节标题（用于去重）
    const existingTitles = chapters.map(ch => ch.title).join('、');

    // 构建精简的前文回顾（只保留最近3章详细信息，其他章节仅列标题）
    const recentChapters = chapters.slice(-3);
    const olderChapters = chapters.slice(0, -3);

    let previousContext = '';

    if (olderChapters.length > 0) {
      previousContext += '**早期章节**（仅标题）：\n';
      previousContext += olderChapters.map(ch => `- 第${ch.chapterNumber}章：${ch.title}`).join('\n');
      previousContext += '\n\n';
    }

    if (recentChapters.length > 0) {
      previousContext += '**近期章节**（详细回顾）：\n\n';
      previousContext += recentChapters.map(ch => {
        return `## 第 ${ch.chapterNumber} 章：${ch.title}

**简介**：${ch.summary}

**关键情节**（前300字）：
${ch.content.substring(0, 300)}${ch.content.length > 300 ? '...' : ''}
`;
      }).join('\n\n');
    }

    return basePrompt + `

**前文章节回顾**：
${previousContext}

**已存在的章节标题**：
${existingTitles}

**续写要点**（第 ${chapterNumber} 章）：
- ⚠️ **章节标题必须唯一**，不得与已有章节标题重复
- 保持前文风格与人物设定的一致性
- 情节自然衔接上一章，推动故事向前发展
- 可引入新冲突、转折或揭示伏笔
- 注重人物性格的连贯性和成长弧线
- 确保本章有明确的情节推进，避免重复前文内容`;
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

  /**
   * 标准化章节标题（用于去重检查）
   * 移除章节号前缀、空格、标点符号，统一为小写
   */
  private normalizeTitle(title: string): string {
    return title
      .replace(/^第.+?章[：:\s]*/g, '') // 移除"第X章："前缀
      .replace(/\s+/g, '') // 移除所有空格
      .replace(/[，。！？；：、""''（）《》【】]/g, '') // 移除中文标点
      .toLowerCase() // 转小写
      .trim();
  }
}
