import { Inject, Injectable } from '@sker/core';
import { WorkflowGraphAst, NodeEvent, generateId } from '@sker/workflow';
import { ChapterData, StoryWeaverAst } from '@sker/workflow-ast';
import { Observable, of, from, throwError, Subject, merge, timer, race } from 'rxjs';
import { concatMap, expand, scan, last, map, catchError, tap, takeUntil, finalize, filter, timeout } from 'rxjs/operators';
import { z } from 'zod';
import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai';
import { StructuredToolInterface } from '@langchain/core/tools';
import { Runnable } from '@langchain/core/runnables';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { AIMessageChunk } from '@langchain/core/messages';
import { parse as parseWithHarmony } from '@sker/json-harmony';
import { useLlmModel } from '../llm-client';
import { ChapterQualityService, QualityCheckResult, QualityIssue } from './ChapterQualityService';
import { PromptBuilder } from './PromptBuilder';
import { ContentValidator } from './ContentValidator';
import { StoryContextService } from './StoryContextService';
import { StoryToolsFactory } from './StoryToolsFactory';
import { LlmInvoker } from './LlmInvoker';
import { StreamingLlmInvoker, StreamChunk } from './StreamingLlmInvoker';

interface AttemptResult {
  chapter: ChapterData;
  quality: QualityCheckResult;
  attempt: number;
}

interface GenerationState {
  attempt: number;
  improvementHints: string;
  allAttempts: AttemptResult[];
  result?: AttemptResult | null;
}

interface MessageContent {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ParsedChapter {
  title: string;
  summary: string;
  content: string;
  clues?: Array<{
    id: string;
    description: string;
    status: 'pending' | 'resolved';
  }>;
  resolvedClueIds?: string[];
}

interface ChapterEmitData {
  title: string;
  summary: string;
  content: string;
  chapterNumber: number;
  chapterData: ChapterData;
  previousChapters: ChapterData[];
  isComplete: boolean;
  nextPrompt?: string;
}

/**
 * 章节生成服务
 * 职责：章节生成的核心逻辑，包括重试、质检、内容提取
 */
@Injectable()
export class ChapterGenerationService {
  constructor(
    @Inject(ChapterQualityService) private qualityService: ChapterQualityService,
    @Inject(PromptBuilder) private promptBuilder: PromptBuilder,
    @Inject(ContentValidator) private contentValidator: ContentValidator,
    @Inject(StoryContextService) private contextService: StoryContextService,
    @Inject(StoryToolsFactory) private toolsFactory: StoryToolsFactory,
    @Inject(LlmInvoker) private llmInvoker: LlmInvoker,
    @Inject(StreamingLlmInvoker) private streamingLlmInvoker: StreamingLlmInvoker
  ) {}

  /**
   * 使用 RxJS 实现章节生成 + 质检 + 重试的完整流程（支持流式）
   * 返回 Observable<NodeEvent>，包含：
   * - node_delta: 实时文本片段（流式模式）
   * - node_emit: 最终完整章节数据
   */
  generateChapterWithRetry(
    ast: StoryWeaverAst,
    ctx: WorkflowGraphAst,
    signal: AbortSignal,
    enableStreaming: boolean = true
  ): Observable<NodeEvent[] | NodeEvent> {
    // 定义提取 Schema：只提取元数据 + 正文的起止标记
    const ExtractionSchema = z.object({
      title: z.string().describe('章节标题'),
      summary: z.string().describe('章节简介'),
      contentStartMarker: z.string().describe('正文开头的前20字（用于定位）'),
      contentEndMarker: z.string().describe('正文结尾的后20字（用于定位）'),
      clues: z.array(z.object({
        id: z.string().describe('伏笔唯一ID'),
        description: z.string().describe('伏笔描述'),
        status: z.enum(['pending', 'resolved']).describe('状态')
      })).optional().describe('本章埋下的伏笔列表（可选）'),
      resolvedClueIds: z.array(z.string()).optional().describe('本章回填的伏笔ID列表（可选）')
    });

    const chapters = (ast.previousChapters || []).filter(ch => {
      // 过滤掉空章节
      if (!ch.content || ch.content.trim().length === 0) {
        console.warn(`[ChapterGeneration] 过滤空章节 ${ch.chapterNumber}`);
        return false;
      }

      // 过滤掉异常章节（包含 LLM 的"思考过程"而非真实小说内容）
      const suspiciousPatterns = [
        '我先查看',
        '让我查看',
        '我需要了解',
        '让我先',
        '暂无明确章节标题',
        '我先回顾',
        '我将',
        '叙述者回顾',
        '叙述者表示'
      ];

      const titleSuspicious = suspiciousPatterns.some(pattern => ch.title.includes(pattern));
      const contentSuspicious = suspiciousPatterns.some(pattern =>
        ch.content && ch.content.substring(0, 200).includes(pattern) // 只检查前200字
      );

      if (titleSuspicious || contentSuspicious) {
        return false;
      }

      return true;
    });
    const isFirstChapter = chapters.length === 0;
    const nextChapterNumber = isFirstChapter ? 1 : Math.max(...chapters.map(c => c.chapterNumber)) + 1;

    const existingTitles = new Set(chapters.map(ch => this.contentValidator.normalizeTitle(ch.title)));
    const useTools = chapters.length > 10;

    const baseModel = useLlmModel({ model: ast.model, temperature: ast.temperature });
    const model = useTools ? baseModel.bindTools(this.createTools(chapters, ctx, ast.id, useTools)) : baseModel;

    const systemPrompt = this.promptBuilder.buildSystemPrompt(ast, chapters, isFirstChapter, nextChapterNumber, useTools);
    const prompts = Array.isArray(ast.prompt) ? ast.prompt.join('\n') : ast.prompt;
    const pendingClues = this.contextService.collectPendingClues(chapters);
    const userPrompt = this.promptBuilder.buildUserPrompt(nextChapterNumber, ast.wordCount, prompts, pendingClues);

    // 创建流式事件主题
    const streamEventSubject = new Subject<NodeEvent>();
    const completionSubject = new Subject<void>();

    // 主处理流：重试 + 质检逻辑
    const mainFlow$ = of({ attempt: 0, improvementHints: '', allAttempts: [] as AttemptResult[] }).pipe(
      expand((state: GenerationState) => {
        if (state.attempt >= (ast.maxRewriteRetries || 2)) {
          return of();
        }

        return this.generateSingleAttempt(
          ast,
          ctx,
          signal,
          model,
          baseModel,
          systemPrompt,
          userPrompt,
          state,
          nextChapterNumber,
          existingTitles,
          ExtractionSchema,
          chapters,
          useTools,
          enableStreaming,
          streamEventSubject
        );
      }),
      scan((acc: GenerationState, curr: GenerationState) => {
        if (curr.result && curr.result.chapter && curr.result.quality && typeof curr.result.quality.score === 'number') {
          acc.allAttempts.push(curr.result);
        }

        return {
          attempt: typeof curr.attempt === 'number' ? curr.attempt : acc.attempt,
          improvementHints: curr.improvementHints || '',
          allAttempts: acc.allAttempts
        };
      }, { attempt: 0, improvementHints: '', allAttempts: [] as AttemptResult[] }),
      last(),
      map((finalState) => this.selectBestAttempt(finalState, ast, nextChapterNumber)),
      finalize(() => {
        completionSubject.next();
        completionSubject.complete();
        streamEventSubject.complete();
      })
    );

    // 流式模式：合并实时事件和最终结果
    if (enableStreaming) {
      return merge(
        streamEventSubject.asObservable().pipe(takeUntil(completionSubject)),
        mainFlow$
      );
    }

    // 批量模式：仅返回最终结果
    return mainFlow$;
  }

  private generateSingleAttempt(
    ast: StoryWeaverAst,
    ctx: WorkflowGraphAst,
    signal: AbortSignal,
    model: ChatOpenAI<ChatOpenAICallOptions> | Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>,
    baseModel: ChatOpenAI<ChatOpenAICallOptions>,
    systemPrompt: string,
    userPrompt: string,
    state: GenerationState,
    nextChapterNumber: number,
    existingTitles: Set<string>,
    ExtractionSchema: z.ZodObject<z.ZodRawShape>,
    chapters: ChapterData[],
    useTools: boolean,
    enableStreaming: boolean,
    streamEventSubject: Subject<NodeEvent>
  ): Observable<GenerationState> {
    let currentUserPrompt = userPrompt;
    if (state.improvementHints) {
      currentUserPrompt += `\n\n**⚠️ 上一版本质量问题（需改进）**：\n${state.improvementHints}`;
    }
    const initialMessages: MessageContent[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: currentUserPrompt }
    ];

    const tools = useTools ? this.createTools(chapters, ctx, ast.id, useTools) : [];

    console.log(`[ChapterGeneration] 开始生成尝试，章节号: ${nextChapterNumber}，尝试次数: ${state.attempt + 1}`);

    // 流式模式
    if (enableStreaming) {
      return this.invokeWithStreaming(
        model,
        initialMessages,
        signal,
        useTools,
        tools,
        ast,
        streamEventSubject
      ).pipe(
        catchError((error) => this.handleLlmError(error, useTools, chapters)),
        concatMap((rawText: string) => {
          console.log(`[ChapterGeneration] 流式模式收到原始文本长度: ${rawText?.length || 0}`);
          console.log(`[ChapterGeneration] 流式模式原始文本预览: ${rawText?.slice(0, 200)}...`);

          if (!rawText || rawText.trim().length === 0) {
            return throwError(() => new Error('流式模式：LLM 未生成任何内容，rawText 为空'));
          }

          return this.extractStructuredContent(baseModel, rawText, signal, ExtractionSchema);
        }),
        map((parsed) => this.validateAndCleanContent(parsed, nextChapterNumber, existingTitles)),
        concatMap(({ chapter, attempt }) => this.performQualityCheck(ast, chapter, attempt, chapters, signal)),
        concatMap(({ chapter, quality, attempt }) => {
          // ✅ 检查质量是否达标，如果达标则立即保存
          const qualityPassed = quality.score >= ast.minQualityScore;

          if (qualityPassed) {
            console.log(`\n✅ [ChapterGeneration] 章节质量合格`);
            console.log(`   评分: ${quality.score}/${ast.minQualityScore}`);
            console.log(`   章节: 第${chapter.chapterNumber}章 - ${chapter.title}`);
            this.updateAstState(ast, chapter, nextChapterNumber);
          } else {
            console.log(`\n❌ [ChapterGeneration] 章节质量不合格，将重试`);
            console.log(`   评分: ${quality.score}/${ast.minQualityScore}`);
            console.log(`   问题: ${quality.issues.map(i => i.description).join('; ')}`);
            console.log(`   建议: ${quality.suggestions.slice(0, 2).join('; ')}`);
          }

          // 评估质量并返回状态
          return of(this.evaluateQuality(ast, chapter, quality, attempt));
        }),
        catchError((error) => this.handleTitleDuplicate(error, state))
      );
    }

    // 批量模式（向后兼容）
    return this.llmInvoker.invokeWithTools(model, initialMessages, signal, useTools, tools).pipe(
      catchError((error) => this.handleLlmError(error, useTools, chapters)),
      concatMap((rawText: string) => {
        console.log(`[ChapterGeneration] 收到原始文本长度: ${rawText?.length || 0}`);
        console.log(`[ChapterGeneration] 原始文本预览: ${rawText?.slice(0, 200)}...`);

        if (!rawText || rawText.trim().length === 0) {
          return throwError(() => new Error('LLM 未生成任何内容，rawText 为空'));
        }

        return this.extractStructuredContent(baseModel, rawText, signal, ExtractionSchema);
      }),
      map((parsed) => this.validateAndCleanContent(parsed, nextChapterNumber, existingTitles)),
      concatMap(({ chapter, attempt }) => this.performQualityCheck(ast, chapter, attempt, chapters, signal)),
      concatMap(({ chapter, quality, attempt }) => {
        // ✅ 检查质量是否达标，如果达标则立即保存
        const qualityPassed = quality.score >= ast.minQualityScore;

        if (qualityPassed) {
          console.log(`\n✅ [ChapterGeneration] 章节质量合格`);
          console.log(`   评分: ${quality.score}/${ast.minQualityScore}`);
          console.log(`   章节: 第${chapter.chapterNumber}章 - ${chapter.title}`);
          this.updateAstState(ast, chapter, nextChapterNumber);
        } else {
          console.log(`\n❌ [ChapterGeneration] 章节质量不合格，将重试`);
          console.log(`   评分: ${quality.score}/${ast.minQualityScore}`);
          console.log(`   问题: ${quality.issues.map(i => i.description).join('; ')}`);
          console.log(`   建议: ${quality.suggestions.slice(0, 2).join('; ')}`);
        }

        // 评估质量并返回状态
        return of(this.evaluateQuality(ast, chapter, quality, attempt));
      }),
      catchError((error) => this.handleTitleDuplicate(error, state))
    );
  }

  /**
   * 流式调用 LLM（支持工具）
   */
  private async saveDebugLog(filename: string, data: any): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const debugPath = path.join(process.cwd(), filename);
      await fs.writeFile(debugPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`[ChapterGeneration] 已保存调试日志到: ${filename}`);
    } catch (err) {
      console.error('[ChapterGeneration] 保存调试日志失败:', err);
    }
  }

  private invokeWithStreaming(
    model: ChatOpenAI<ChatOpenAICallOptions> | Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>,
    initialMessages: MessageContent[],
    signal: AbortSignal,
    useTools: boolean,
    tools: StructuredToolInterface[],
    ast: StoryWeaverAst,
    streamEventSubject: Subject<NodeEvent>
  ): Observable<string> {
    let accumulatedText = '';

    // 保存生成请求
    this.saveDebugLog('debug-chapter-generation-request.json', {
      timestamp: new Date().toISOString(),
      messages: initialMessages,
      useTools,
      tools: tools.map(t => ({ name: t.name, description: t.description }))
    }).catch(console.error);

    return this.streamingLlmInvoker.streamWithTools(model, initialMessages, signal, useTools, tools).pipe(
      tap((chunk: StreamChunk) => {
        if (chunk.type === 'delta' && chunk.delta) {
          accumulatedText += chunk.delta;
          // 实时推送文本片段到前端
          streamEventSubject.next({
            type: 'node_delta',
            id: ast.id,
            data: { delta: chunk.delta, accumulated: accumulatedText }
          });
        } else if (chunk.type === 'tool_progress' && chunk.toolProgress) {
          // 推送工具执行进度到前端
          streamEventSubject.next({
            type: 'node_progress',
            id: ast.id,
            data: {
              stage: chunk.toolProgress.currentTool,
              message: chunk.toolProgress.message,
              round: chunk.toolProgress.round,
              status: chunk.toolProgress.status
            }
          });
        } else if (chunk.type === 'tool_result' && chunk.toolResult) {
          // 推送工具执行结果到前端
          streamEventSubject.next({
            type: 'node_progress',
            id: ast.id,
            data: {
              stage: chunk.toolResult.toolName,
              message: `✓ ${chunk.toolResult.resultSummary}`,
              status: 'completed'
            }
          });
        }
      }),
      filter((chunk: StreamChunk) => chunk.type === 'complete'),
      map((chunk: StreamChunk) => {
        const finalText = chunk.fullText || accumulatedText;

        // 保存生成响应
        this.saveDebugLog('debug-chapter-generation-response.json', {
          timestamp: new Date().toISOString(),
          fullText: finalText,
          textLength: finalText?.length || 0
        }).catch(console.error);

        return finalText;
      })
    );
  }

  private handleLlmError(error: Error, useTools: boolean, chapters: ChapterData[]): Observable<never> {
    return throwError(() => error);
  }

  /**
   * 提取结构化内容
   * 使用 json-harmony 优雅地解析 LLM 返回的文本
   *
   * 哲学：宁可失败，不以次充好
   * - 不使用降级方案
   * - 解析失败直接抛出错误
   * - 触发重试机制
   */
  private extractStructuredContent(
    baseModel: ChatOpenAI<ChatOpenAICallOptions>,
    rawText: string,
    signal: AbortSignal,
    ExtractionSchema: z.ZodObject<z.ZodRawShape>
  ): Observable<ParsedChapter> {
    const extractionPrompt = this.promptBuilder.buildExtractionPrompt(rawText);

    // 保存提取请求
    this.saveDebugLog('debug-chapter-extraction-request.json', {
      timestamp: new Date().toISOString(),
      rawTextLength: rawText?.length || 0,
      rawTextPreview: rawText?.slice(0, 500),
      extractionPromptLength: extractionPrompt?.length || 0,
      extractionPrompt: extractionPrompt,
      schema: ExtractionSchema.shape
    }).catch(console.error);

    const startTime = Date.now();

    // 使用普通 invoke，让 LLM 返回 JSON 文本，然后用 json-harmony 解析
    return from(baseModel.invoke([
      {
        role: 'system',
        content: '你是一个文本结构化提取专家，精确提取小说章节的元数据。必须以标准 JSON 格式返回结果。'
      },
      { role: 'user', content: extractionPrompt }
    ], { signal })).pipe(
      timeout(60000), // 60秒超时，超时直接抛出错误
      map((aiMessage) => {
        // 获取 LLM 返回的文本
        const responseText = typeof aiMessage.content === 'string'
          ? aiMessage.content
          : JSON.stringify(aiMessage.content);

        console.log(`[extractStructuredContent] LLM 返回文本长度: ${responseText.length}`);
        console.log(`[extractStructuredContent] LLM 返回文本预览: ${responseText.slice(0, 300)}...`);

        // 使用 json-harmony 解析，它能处理：
        // - Markdown 代码块
        // - 无引号的键
        // - 尾随逗号
        // - 混合格式
        const parseResult = parseWithHarmony(responseText);

        console.log(`[extractStructuredContent] json-harmony 解析成功`);
        console.log(`[extractStructuredContent] 使用的恢复策略: ${parseResult.statistics.recoveryStrategiesUsed.join(', ')}`);
        console.log(`[extractStructuredContent] 解析耗时: ${parseResult.statistics.parseTimeMs}ms`);

        // 数据清洗：修复 LLM 可能返回的格式错误
        const sanitizedData = this.sanitizeChapterData(parseResult.data);

        // 使用 zod schema 验证数据结构
        const validated = ExtractionSchema.parse(sanitizedData) as {
          title: string;
          summary: string;
          contentStartMarker?: string;
          contentEndMarker?: string;
          clues?: Array<{
            id: string;
            description: string;
            status: 'pending' | 'resolved';
          }>;
          resolvedClueIds?: string[];
        };

        // 使用标记从原始文本中提取正文内容
        const content = this.extractContentByMarkers(
          rawText,
          validated.contentStartMarker || '',
          validated.contentEndMarker || ''
        );

        // 组装完整的 ParsedChapter
        const parsedChapter: ParsedChapter = {
          title: validated.title,
          summary: validated.summary,
          content: content,
          clues: validated.clues,
          resolvedClueIds: validated.resolvedClueIds
        };

        // 保存提取响应
        this.saveDebugLog('debug-chapter-extraction-response.json', {
          timestamp: new Date().toISOString(),
          result: parsedChapter,
          parseStatistics: parseResult.statistics
        }).catch(console.error);

        return parsedChapter;
      }),
      catchError((error) => {
        // 检查是否为中止错误
        if (signal.aborted) {
          return throwError(() => new Error('任务已被用户取消'));
        }

        // 保存解析错误
        this.saveDebugLog('debug-chapter-extraction-error.json', {
          timestamp: new Date().toISOString(),
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack
          },
          rawTextLength: rawText?.length || 0
        }).catch(console.error);

        console.error(`[extractStructuredContent] 结构化提取失败:`, error);
        console.error(`[extractStructuredContent] 错误详情:`, {
          message: error.message,
          name: error.name,
          stack: error.stack
        });

        // 不使用降级方案，直接抛出错误，触发重试
        return throwError(() => error);
      }),
      finalize(() => {
        const elapsed = Date.now() - startTime;
        console.log(`[extractStructuredContent] 结构化提取流程结束，总耗时: ${elapsed}ms`);
      })
    );
  }

  private validateAndCleanContent(
    parsed: ParsedChapter,
    nextChapterNumber: number,
    existingTitles: Set<string>
  ): { chapter: ChapterData; attempt: number } {
    const cleanedContent = this.contentValidator.cleanContent(parsed.content, parsed.title, parsed.summary);
    const normalizedTitle = this.contentValidator.normalizeTitle(parsed.title);

    if (existingTitles.has(normalizedTitle)) {
      throw new Error(`TITLE_DUPLICATE:${parsed.title}`);
    }

    return {
      chapter: {
        chapterNumber: nextChapterNumber,
        title: parsed.title,
        summary: parsed.summary,
        content: cleanedContent,
        clues: parsed.clues?.map((clue) => ({
          ...clue,
          chapterNumber: nextChapterNumber
        })),
        resolvedClueIds: parsed.resolvedClueIds
      },
      attempt: 0
    };
  }

  private performQualityCheck(
    ast: StoryWeaverAst,
    chapter: ChapterData,
    attempt: number,
    chapters: ChapterData[],
    signal: AbortSignal
  ): Observable<{ chapter: ChapterData; quality: QualityCheckResult; attempt: number }> {
    if (!ast.enableQualityCheck) {
      return of({
        chapter,
        quality: { score: 100, issues: [], suggestions: [], passed: true },
        attempt
      });
    }

    return this.retryQualityCheck(chapter, chapters, ast.wordCount, signal, 0).pipe(
      map((qualityResult) => {
        return { chapter, quality: qualityResult, attempt };
      })
    );
  }

  private retryQualityCheck(
    chapter: ChapterData,
    chapters: ChapterData[],
    wordCount: number,
    signal: AbortSignal,
    retryCount: number
  ): Observable<QualityCheckResult> {
    if (retryCount >= 3) {
      return of({
        score: 70,
        issues: [],
        suggestions: ['质检服务暂时不可用，已使用默认评分'],
        passed: false
      });
    }

    return from(this.qualityService.check(chapter, chapters, wordCount, signal)).pipe(
      catchError((error) => {
        if (retryCount < 2) {
          const backoffDelay = 1000 * Math.pow(2, retryCount);
          return from(new Promise<void>(resolve => setTimeout(resolve, backoffDelay))).pipe(
            concatMap(() => this.retryQualityCheck(chapter, chapters, wordCount, signal, retryCount + 1))
          );
        }
        return of({
          score: 70,
          issues: [],
          suggestions: ['质检失败 3 次，使用默认评分'],
          passed: false
        });
      })
    );
  }

  private evaluateQuality(
    ast: StoryWeaverAst,
    chapter: ChapterData,
    quality: QualityCheckResult,
    attempt: number
  ): GenerationState {

    if (quality.score >= ast.minQualityScore) {
      return {
        result: { chapter, quality, attempt },
        improvementHints: '',
        attempt: ast.maxRewriteRetries ?? 2,
        allAttempts: []
      };
    }

    const improvementHints = this.promptBuilder.buildImprovementHints(quality);

    return {
      result: { chapter, quality, attempt },
      improvementHints,
      attempt: attempt + 1,
      allAttempts: []
    };
  }

  private handleTitleDuplicate(error: Error, state: GenerationState): Observable<GenerationState> {
    if (error.message.startsWith('TITLE_DUPLICATE:')) {
      const title = error.message.replace('TITLE_DUPLICATE:', '');
      const improvementHints = `❌ 标题重复："${title}"与已有章节标题重复，请重新构思一个完全不同的标题\n`;
      return of({
        result: null,
        improvementHints,
        attempt: state.attempt + 1,
        allAttempts: []
      });
    }
    return throwError(() => error);
  }

  private selectBestAttempt(
    finalState: GenerationState,
    ast: StoryWeaverAst,
    nextChapterNumber: number
  ): NodeEvent[] {
    console.log(`[ChapterGeneration] selectBestAttempt 被调用，尝试次数: ${finalState.allAttempts.length}`);

    const bestAttempt = finalState.allAttempts.length > 0
      ? finalState.allAttempts.reduce((best, current) =>
          current.quality.score > best.quality.score ? current : best
        )
      : null;

    if (!bestAttempt) {
      console.error(`[ChapterGeneration] 没有有效的尝试结果`);
      throw new Error(`第${nextChapterNumber}章生成失败：所有重试尝试都未产生有效结果`);
    }

    const { chapter: chapterData, quality: qualityResult } = bestAttempt;

    console.log(`[ChapterGeneration] 选择最佳尝试，质量分数: ${qualityResult.score}，章节号: ${chapterData.chapterNumber}`);

    if (ast.enableQualityCheck) {
      if (qualityResult.issues.length > 0) {
        qualityResult.issues.forEach((issue: QualityIssue) => {
          console.log(`    [${issue.severity}] ${issue.type}: ${issue.description}`);
        });
      }
    }

    // 检查章节是否已经被保存
    const existingIndex = ast.previousChapters.findIndex(ch => ch.chapterNumber === nextChapterNumber);
    if (existingIndex >= 0) {
      console.log(`[ChapterGeneration] 章节 ${nextChapterNumber} 已存在于 previousChapters，跳过保存（或覆盖）`);
      // 注意：这里仍然调用 updateAstState，因为它会覆盖现有章节（如果最佳尝试更好）
      // 但是由于我们已经在 generateSingleAttempt 中保存了质量合格的章节，这里通常不会执行
    } else {
      console.log(`[ChapterGeneration] 章节 ${nextChapterNumber} 不存在于 previousChapters，现在保存`);
    }

    this.updateAstState(ast, chapterData, nextChapterNumber);

    return [this.buildEmitEvent(ast, chapterData)];
  }

  private updateAstState(ast: StoryWeaverAst, chapterData: ChapterData, nextChapterNumber: number): void {
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

    const isComplete = ast.previousChapters.length >= ast.targetChapterCount;
    ast.isComplete = isComplete;

    if (!isComplete) {
      ast.nextPrompt = `继续创作第 ${nextChapterNumber + 1} 章。前情提要：${chapterData.summary}`;
    }
  }

  /**
   * 数据清洗：修复 LLM 返回的格式错误
   *
   * 常见错误：
   * 1. clues 是字符串数组而非对象数组
   * 2. resolvedClueIds 包含完整描述而非ID
   */
  private sanitizeChapterData(data: any): any {
    const sanitized = { ...data };

    // 修复 clues：如果是字符串数组，转换为对象数组
    if (Array.isArray(sanitized.clues)) {
      sanitized.clues = sanitized.clues.map((clue: any, index: number) => {
        if (typeof clue === 'string') {
          // 字符串转对象：生成唯一ID
          return {
            id: `clue_${generateId()}`,
            description: clue,
            status: 'pending'
          };
        }
        return clue;
      });
    }

    // 修复 resolvedClueIds：如果包含完整描述，尝试提取ID或生成警告
    if (Array.isArray(sanitized.resolvedClueIds)) {
      sanitized.resolvedClueIds = sanitized.resolvedClueIds.map((id: any) => {
        if (typeof id === 'string') {
          // 如果长度超过50，可能是描述而非ID，截取或生成ID
          if (id.length > 50) {
            console.warn(`[sanitizeChapterData] resolvedClueIds 包含描述而非ID: "${id.slice(0, 50)}..."`);
            // 尝试从描述中提取ID（如果有 clue_ 前缀）
            const match = id.match(/clue_\w+/);
            return match ? match[0] : `resolved_${generateId()}`;
          }
          return id;
        }
        return id;
      });
    }

    return sanitized;
  }

  /**
   * 使用起止标记从原始文本中提取正文内容
   *
   * @param rawText 原始文本（包含标题、简介、正文、伏笔说明等）
   * @param startMarker 正文开头标记（前20字左右）
   * @param endMarker 正文结尾标记（后20字左右）
   */
  private extractContentByMarkers(rawText: string, startMarker: string, endMarker: string): string {
    // 去除标记中的空白符，提高匹配成功率
    const normalizedText = rawText.replace(/\s+/g, ' ');
    const normalizedStart = startMarker.replace(/\s+/g, ' ').trim();
    const normalizedEnd = endMarker.replace(/\s+/g, ' ').trim();

    const startIndex = normalizedText.indexOf(normalizedStart);
    const endIndex = normalizedText.indexOf(normalizedEnd);

    if (startIndex === -1) {
      console.warn(`[extractContentByMarkers] 未找到起始标记: "${startMarker.slice(0, 30)}..."`);
      // 降级：使用算法提取
      return this.extractContentFromRawText(rawText);
    }

    if (endIndex === -1) {
      console.warn(`[extractContentByMarkers] 未找到结束标记: "${endMarker.slice(0, 30)}..."`);
      // 降级：从起始标记到文本末尾
      const startOffset = this.findOriginalOffset(rawText, normalizedText, startIndex);
      return rawText.substring(startOffset).trim();
    }

    // 计算在原始文本中的偏移量（考虑空白符差异）
    const startOffset = this.findOriginalOffset(rawText, normalizedText, startIndex);
    const endOffset = this.findOriginalOffset(rawText, normalizedText, endIndex + normalizedEnd.length);

    const content = rawText.substring(startOffset, endOffset).trim();

    console.log(`[extractContentByMarkers] 成功提取正文，长度: ${content.length} 字符`);
    return content;
  }

  /**
   * 在原始文本中找到对应于规范化文本位置的偏移量
   */
  private findOriginalOffset(originalText: string, normalizedText: string, normalizedOffset: number): number {
    let originalIdx = 0;
    let normalizedIdx = 0;

    while (normalizedIdx < normalizedOffset && originalIdx < originalText.length) {
      const originalChar = originalText[originalIdx] as string;
      const normalizedChar = normalizedText[normalizedIdx];

      if (/\s/.test(originalChar)) {
        // 原始文本是空白符，跳过
        originalIdx++;
        if (normalizedChar === ' ') {
          normalizedIdx++;
        }
      } else {
        // 非空白符，必须匹配
        originalIdx++;
        normalizedIdx++;
      }
    }

    return originalIdx;
  }

  /**
   * 从原始文本中提取正文内容（降级方案）
   * 去除标题（# 开头的行）和其他元数据标记
   */
  private extractContentFromRawText(rawText: string): string {
    // 按行分割
    const lines = rawText.split('\n');
    const contentLines: string[] = [];
    let skipNextEmpty = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // 跳过标题行（# 开头）
      if (trimmed.startsWith('#')) {
        skipNextEmpty = true;
        continue;
      }

      // 跳过标题后的第一个空行
      if (skipNextEmpty && trimmed === '') {
        skipNextEmpty = false;
        continue;
      }

      skipNextEmpty = false;
      contentLines.push(line);
    }

    // 去除开头和结尾的空行
    let content = contentLines.join('\n').trim();

    // 去除可能的伏笔说明部分（通常在末尾）
    const clueMarkers = ['**伏笔', '伏笔说明', 'clues:', '本章伏笔'];
    for (const marker of clueMarkers) {
      const index = content.lastIndexOf(marker);
      if (index > content.length * 0.8) { // 只在文本末尾20%处寻找
        content = content.substring(0, index).trim();
      }
    }

    return content;
  }

  private buildEmitEvent(ast: StoryWeaverAst, chapterData: ChapterData): NodeEvent {
    const emitData: ChapterEmitData = {
      title: chapterData.title,
      summary: chapterData.summary,
      content: chapterData.content,
      chapterNumber: chapterData.chapterNumber,
      chapterData,
      previousChapters: ast.previousChapters,
      isComplete: ast.isComplete
    };

    if (!ast.isComplete) {
      emitData.nextPrompt = ast.nextPrompt;
    }

    return { type: 'node_emit', id: ast.id, data: emitData };
  }

  private createTools(chapters: ChapterData[], ctx: WorkflowGraphAst, currentAstId: string, useTools: boolean): StructuredToolInterface[] {
    if (!useTools) return [];

    const chapterTools = this.toolsFactory.createChapterTools(chapters);
    const nodeTools = this.toolsFactory.createNodeTools(ctx, currentAstId);
    return [...chapterTools, ...nodeTools];
  }
}
