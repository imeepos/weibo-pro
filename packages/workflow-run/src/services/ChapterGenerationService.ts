import { Inject, Injectable } from '@sker/core';
import { WorkflowGraphAst, NodeEvent } from '@sker/workflow';
import { ChapterData, StoryWeaverAst } from '@sker/workflow-ast';
import { Observable, of, from, throwError, Subject, merge } from 'rxjs';
import { concatMap, expand, scan, last, map, catchError, tap, takeUntil, finalize, filter } from 'rxjs/operators';
import { z } from 'zod';
import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai';
import { StructuredToolInterface } from '@langchain/core/tools';
import { Runnable } from '@langchain/core/runnables';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { AIMessageChunk } from '@langchain/core/messages';
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
    const ChapterOutputSchema = z.object({
      title: z.string().describe('章节标题（简洁有力，体现核心冲突）'),
      summary: z.string().describe('章节简介，用一个七言绝句概括核心情节'),
      content: z.string().describe(`章节正文（${ast.wordCount}字左右，偏差不超过±10%）。注意：只包含正文内容，不要重复输出标题和简介`),
      clues: z.array(z.object({
        id: z.string().describe('伏笔唯一ID（如 clue_chapter2_mirror）'),
        description: z.string().describe('伏笔描述'),
        status: z.enum(['pending', 'resolved']).describe('状态：pending待回填 / resolved已回填')
      })).optional().describe('本章埋下的伏笔列表（可选）'),
      resolvedClueIds: z.array(z.string()).optional().describe('本章回填的伏笔ID列表（可选）')
    });

    const chapters = (ast.previousChapters || []).filter(ch => ch.content && ch.content.trim().length > 0);
    const isFirstChapter = chapters.length === 0;
    const nextChapterNumber = isFirstChapter ? 1 : Math.max(...chapters.map(c => c.chapterNumber)) + 1;

    console.log(`[ChapterGeneration] 章节计算: previousChapters.length=${ast.previousChapters?.length ?? 0}, validChapters=${chapters.length}, nextChapter=${nextChapterNumber}`);

    const existingTitles = new Set(chapters.map(ch => this.contentValidator.normalizeTitle(ch.title)));
    const useTools = chapters.length > 10;

    const baseModel = useLlmModel({ model: ast.model, temperature: ast.temperature });
    const model = useTools ? baseModel.bindTools(this.createTools(chapters, ctx, ast.id, useTools)) : baseModel;

    if (useTools) {
      console.log(`[ChapterGeneration] 启用工具模式（已有 ${chapters.length} 章）`);
    }

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
          ChapterOutputSchema,
          chapters,
          useTools,
          enableStreaming,
          streamEventSubject
        );
      }),
      scan((acc: GenerationState, curr: GenerationState) => {
        if (curr.result && curr.result.chapter && curr.result.quality && typeof curr.result.quality.score === 'number') {
          acc.allAttempts.push(curr.result);
        } else {
          console.warn(`[ChapterGeneration] 跳过无效的重试结果:`, curr);
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
    ChapterOutputSchema: z.ZodObject<z.ZodRawShape>,
    chapters: ChapterData[],
    useTools: boolean,
    enableStreaming: boolean,
    streamEventSubject: Subject<NodeEvent>
  ): Observable<GenerationState> {
    let currentUserPrompt = userPrompt;
    if (state.improvementHints) {
      currentUserPrompt += `\n\n**⚠️ 上一版本质量问题（需改进）**：\n${state.improvementHints}`;
    }

    console.log(`[ChapterGeneration] 第${nextChapterNumber}章生成中...（第${state.attempt + 1}次尝试）${enableStreaming ? ' [流式模式]' : ''}`);

    const initialMessages: MessageContent[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: currentUserPrompt }
    ];

    const tools = useTools ? this.createTools(chapters, ctx, ast.id, useTools) : [];

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
          console.log(`[ChapterGeneration] 生成文本长度: ${rawText.length} 字`);
          return this.extractStructuredContent(baseModel, rawText, signal, ChapterOutputSchema);
        }),
        map((parsed) => this.validateAndCleanContent(parsed, nextChapterNumber, existingTitles)),
        concatMap(({ chapter, attempt }) => this.performQualityCheck(ast, chapter, attempt, chapters, signal)),
        map(({ chapter, quality, attempt }) => this.evaluateQuality(ast, chapter, quality, attempt)),
        catchError((error) => this.handleTitleDuplicate(error, state))
      );
    }

    // 批量模式（向后兼容）
    return this.llmInvoker.invokeWithTools(model, initialMessages, signal, useTools, tools).pipe(
      catchError((error) => this.handleLlmError(error, useTools, chapters)),
      concatMap((rawText: string) => {
        console.log(`[ChapterGeneration] 生成文本长度: ${rawText.length} 字`);
        return this.extractStructuredContent(baseModel, rawText, signal, ChapterOutputSchema);
      }),
      map((parsed) => this.validateAndCleanContent(parsed, nextChapterNumber, existingTitles)),
      concatMap(({ chapter, attempt }) => this.performQualityCheck(ast, chapter, attempt, chapters, signal)),
      map(({ chapter, quality, attempt }) => this.evaluateQuality(ast, chapter, quality, attempt)),
      catchError((error) => this.handleTitleDuplicate(error, state))
    );
  }

  /**
   * 流式调用 LLM（支持工具）
   */
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
        } else if (chunk.type === 'tool_call') {
          console.log(`[ChapterGeneration] LLM 请求调用工具: ${chunk.toolCalls?.length} 个`);
        }
      }),
      filter((chunk: StreamChunk) => chunk.type === 'complete'),
      map((chunk: StreamChunk) => chunk.fullText || accumulatedText)
    );
  }

  private handleLlmError(error: Error, useTools: boolean, chapters: ChapterData[]): Observable<never> {
    const errorInfo = {
      message: error.message,
      status: (error as { status?: number }).status,
      statusText: (error as { statusText?: string }).statusText,
      rawError: JSON.stringify(error, null, 2).substring(0, 500)
    };
    console.error(`[ChapterGeneration] LLM 调用失败:`, errorInfo);
    return throwError(() => error);
  }

  private extractStructuredContent(
    baseModel: ChatOpenAI<ChatOpenAICallOptions>,
    rawText: string,
    signal: AbortSignal,
    ChapterOutputSchema: z.ZodObject<z.ZodRawShape>
  ): Observable<ParsedChapter> {
    const extractionPrompt = this.promptBuilder.buildExtractionPrompt(rawText);
    const extractionModel = baseModel.withStructuredOutput(ChapterOutputSchema);

    return from(extractionModel.invoke([
      { role: 'system', content: '你是一个文本结构化提取专家，精确提取小说章节的元数据。' },
      { role: 'user', content: extractionPrompt }
    ], { signal })).pipe(
      map((result) => result as unknown as ParsedChapter),
      catchError((error) => {
        console.error(`[ChapterGeneration] 结构化提取失败:`, {
          message: error.message,
          status: error.status
        });
        return throwError(() => error);
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

    console.log(`[ChapterGeneration] 第${chapter.chapterNumber}章质检中...（第${attempt + 1}次尝试）`);

    return this.retryQualityCheck(chapter, chapters, ast.wordCount, signal, 0).pipe(
      map((qualityResult) => {
        console.log(`[ChapterGeneration] 质检完成，最终评分: ${qualityResult.score}/100`);
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
      console.warn(`[ChapterGeneration] 质检重试次数已达上限（3次），使用默认评分 70`);
      return of({
        score: 70,
        issues: [],
        suggestions: ['质检服务暂时不可用，已使用默认评分'],
        passed: false
      });
    }

    return from(this.qualityService.check(chapter, chapters, wordCount, signal)).pipe(
      catchError((error) => {
        console.warn(`[ChapterGeneration] 质检失败（${retryCount + 1}/3）: ${error.message}`);
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
    console.log(`[ChapterGeneration] 第${chapter.chapterNumber}章质量评分：${quality.score}/100`);

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
    const bestAttempt = finalState.allAttempts.length > 0
      ? finalState.allAttempts.reduce((best, current) =>
          current.quality.score > best.quality.score ? current : best
        )
      : null;

    if (!bestAttempt) {
      throw new Error(`第${nextChapterNumber}章生成失败：所有重试尝试都未产生有效结果`);
    }

    const { chapter: chapterData, quality: qualityResult } = bestAttempt;

    if (ast.enableQualityCheck) {
      console.log(`[ChapterGeneration] 第${nextChapterNumber}章质量报告（最佳版本，尝试 ${bestAttempt.attempt + 1}）：`);
      console.log(`  - 综合评分：${qualityResult.score}/100`);
      console.log(`  - 质量问题数：${qualityResult.issues.length}`);
      if (qualityResult.issues.length > 0) {
        qualityResult.issues.forEach((issue: QualityIssue) => {
          console.log(`    [${issue.severity}] ${issue.type}: ${issue.description}`);
        });
      }
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

    console.log(`[ChapterGeneration] 构建了 ${chapterTools.length + nodeTools.length} 个工具：${chapterTools.length} 个章节工具 + ${nodeTools.length} 个节点工具`);

    return [...chapterTools, ...nodeTools];
  }
}
