import { Inject, Injectable } from '@sker/core';
import { WorkflowGraphAst, NodeEvent } from '@sker/workflow';
import { ChapterData, StoryWeaverAst } from '@sker/workflow-ast';
import { Observable, of, from, throwError, Subject, merge } from 'rxjs';
import { concatMap, map, catchError, finalize, takeUntil } from 'rxjs/operators';
import { z } from 'zod';
import { useLlmModel } from '../llm-client';
import { ChapterQualityService, QualityCheckResult, QualityIssue } from './ChapterQualityService';
import { PromptBuilder } from './PromptBuilder';
import { ContentValidator } from './ContentValidator';
import { StoryContextService } from './StoryContextService';
import { StoryToolsFactory } from './StoryToolsFactory';
import { LlmInvoker } from './LlmInvoker';
import { StreamingLlmInvoker } from './StreamingLlmInvoker';
import { ChapterStructuredExtractor } from './chapter/ChapterStructuredExtractor';
import { ChapterStreamingHandler } from './chapter/ChapterStreamingHandler';
import { validateAndCleanContent } from './chapter/chapter-content-extractor';
import { prepareChapterContext } from './chapter/chapter-preprocessing';

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
 * 职责：章节生成的核心编排，包括重试、质检、内容提取
 */
@Injectable()
export class ChapterGenerationService {
  private structuredExtractor: ChapterStructuredExtractor;
  private streamingHandler: ChapterStreamingHandler;

  constructor(
    @Inject(ChapterQualityService) private qualityService: ChapterQualityService,
    @Inject(PromptBuilder) private promptBuilder: PromptBuilder,
    @Inject(ContentValidator) private contentValidator: ContentValidator,
    @Inject(StoryContextService) private contextService: StoryContextService,
    @Inject(StoryToolsFactory) private toolsFactory: StoryToolsFactory,
    @Inject(LlmInvoker) private llmInvoker: LlmInvoker,
    @Inject(StreamingLlmInvoker) private streamingLlmInvoker: StreamingLlmInvoker
  ) {
    this.structuredExtractor = new ChapterStructuredExtractor(this.promptBuilder);
    this.streamingHandler = new ChapterStreamingHandler(this.promptBuilder, this.llmInvoker, this.streamingLlmInvoker, this.toolsFactory);
  }

  /**
   * 简化版章节生成：草稿 → 改进 → 结构化（支持流式）
   *
   * 哲学：大道至简
   * - 第1步：生成草稿
   * - 第2步：自我改进
   * - 第3步：提取结构化数据
   */
  generateChapterWithRetry(
    ast: StoryWeaverAst,
    ctx: WorkflowGraphAst,
    signal: AbortSignal,
    enableStreaming: boolean = true
  ): Observable<NodeEvent[] | NodeEvent> {
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

    const { chapters, isFirstChapter, nextChapterNumber, existingTitles } = prepareChapterContext(ast, this.contentValidator);
    const useTools = true;

    const baseModel = useLlmModel({ model: ast.model, temperature: ast.temperature });
    const model = useTools ? baseModel.bindTools(this.streamingHandler.createTools(chapters, ctx, ast, useTools)) : baseModel;

    const systemPrompt = this.promptBuilder.buildSystemPrompt(ast, chapters, isFirstChapter, nextChapterNumber, useTools);
    const prompts = Array.isArray(ast.prompt) ? ast.prompt.join('\n') : ast.prompt;
    const pendingClues = this.contextService.collectPendingClues(chapters);
    const userPrompt = this.promptBuilder.buildUserPrompt(nextChapterNumber, ast.wordCount, prompts, pendingClues);

    const streamEventSubject = new Subject<NodeEvent>();
    const completionSubject = new Subject<void>();

    // 简化的三步流程：草稿 → 改进 → 结构化
    const mainFlow$ = of(null).pipe(
      concatMap(() => {
        console.log('\n🌱 [Step 1/3] 生成草稿...');
        return this.streamingHandler.generateDraft(model, systemPrompt, userPrompt, signal, useTools, chapters, ctx, ast, streamEventSubject, enableStreaming);
      }),
      concatMap((draftText: string) => {
        console.log(`\n✅ [Step 1/3] 草稿完成，长度: ${draftText.length}字`);
        console.log('\n✨ [Step 2/3] 自我改进...');
        return this.streamingHandler.selfRefine(baseModel, draftText, ast.wordCount, signal, ast, streamEventSubject, enableStreaming, chapters, ctx);
      }),
      concatMap((refinedText: string) => {
        console.log(`\n✅ [Step 2/3] 改进完成，长度: ${refinedText.length}字`);
        console.log('\n🔍 [Step 3/3] 提取结构化数据...');
        return this.structuredExtractor.extractWithRetry(baseModel, refinedText, signal, ExtractionSchema, 3).pipe(
          map((parsed) => validateAndCleanContent(parsed, nextChapterNumber, existingTitles, this.contentValidator)),
          map(({ chapter }) => {
            console.log(`\n✅ [Step 3/3] 完成：第${chapter.chapterNumber}章《${chapter.title}》`);
            this.updateAstState(ast, chapter, nextChapterNumber);
            return [this.buildEmitEvent(ast, chapter)];
          })
        );
      }),
      finalize(() => {
        completionSubject.next();
        completionSubject.complete();
        streamEventSubject.complete();
      })
    );

    if (enableStreaming) {
      return merge(
        streamEventSubject.asObservable().pipe(takeUntil(completionSubject)),
        mainFlow$
      );
    }

    return mainFlow$;
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
      catchError((_error) => {
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

    if (finalState.allAttempts.length === 0) {
      console.error(`[ChapterGeneration] 没有有效的尝试结果`);
      throw new Error(`第${nextChapterNumber}章生成失败：所有重试尝试都未产生有效结果`);
    }

    const bestAttempt = finalState.allAttempts.reduce((best, current) =>
      current.quality.score > best.quality.score ? current : best
    );

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
      const existingChapter = ast.previousChapters[existingIndex];
      console.log(`[ChapterGeneration] 章节 ${nextChapterNumber} 已存在，将覆盖为新版本`);
      console.log(`[ChapterGeneration] 旧版本: ${existingChapter?.title}`);
      console.log(`[ChapterGeneration] 新版本: ${chapterData.title}`);
    } else {
      console.log(`[ChapterGeneration] 章节 ${nextChapterNumber} 不存在，现在保存`);
    }

    this.updateAstState(ast, chapterData, nextChapterNumber);

    return [this.buildEmitEvent(ast, chapterData)];
  }

  private updateAstState(ast: StoryWeaverAst, chapterData: ChapterData, nextChapterNumber: number): void {
    const existingIndex = ast.previousChapters.findIndex(ch => ch.chapterNumber === nextChapterNumber);

    // 不可变更新：创建新数组，触发React重新渲染
    if (existingIndex >= 0) {
      console.log(`[updateAstState] 覆盖章节 ${nextChapterNumber}，索引 ${existingIndex}`);
      ast.previousChapters = [
        ...ast.previousChapters.slice(0, existingIndex),
        chapterData,
        ...ast.previousChapters.slice(existingIndex + 1)
      ];
    } else {
      console.log(`[updateAstState] 新增章节 ${nextChapterNumber}，当前共 ${ast.previousChapters.length + 1} 章`);
      ast.previousChapters = [...ast.previousChapters, chapterData];
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

  private handleLlmError(error: Error, _useTools: boolean, _chapters: ChapterData[]): Observable<never> {
    return throwError(() => error);
  }
}
