import { WorkflowGraphAst, NodeEvent } from '@sker/workflow';
import { ChapterData, StoryWeaverAst } from '@sker/workflow-ast';
import { Observable, Subject } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai';
import { StructuredToolInterface } from '@langchain/core/tools';
import { Runnable } from '@langchain/core/runnables';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { AIMessageChunk } from '@langchain/core/messages';
import { PromptBuilder } from '../PromptBuilder';
import { LlmInvoker } from '../LlmInvoker';
import { StreamingLlmInvoker, StreamChunk } from '../StreamingLlmInvoker';
import { StoryToolsFactory } from '../StoryToolsFactory';

interface MessageContent {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 章节流式处理处理器
 * 职责：草稿生成、自我改进、流式事件转发（含节流）
 */
export class ChapterStreamingHandler {
  constructor(
    private promptBuilder: PromptBuilder,
    private llmInvoker: LlmInvoker,
    private streamingLlmInvoker: StreamingLlmInvoker,
    private toolsFactory: StoryToolsFactory
  ) {}

  /**
   * Step 1: 生成草稿（流式）
   */
  generateDraft(
    model: ChatOpenAI<ChatOpenAICallOptions> | Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>,
    systemPrompt: string,
    userPrompt: string,
    signal: AbortSignal,
    useTools: boolean,
    chapters: ChapterData[],
    ctx: WorkflowGraphAst,
    ast: StoryWeaverAst,
    streamEventSubject: Subject<NodeEvent>,
    enableStreaming: boolean
  ): Observable<string> {
    const initialMessages: MessageContent[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const tools = useTools ? this.createTools(chapters, ctx, ast, useTools) : [];

    if (enableStreaming) {
      return this.invokeWithStreaming(model, initialMessages, signal, useTools, tools, ast, streamEventSubject);
    }

    return this.llmInvoker.invokeWithTools(model, initialMessages, signal, useTools, tools);
  }

  /**
   * Step 2: 自我改进（流式）
   * 保持工具开启，虽然改进提示词通常不需要调用工具
   */
  selfRefine(
    model: ChatOpenAI<ChatOpenAICallOptions>,
    draftText: string,
    wordCount: number,
    signal: AbortSignal,
    ast: StoryWeaverAst,
    streamEventSubject: Subject<NodeEvent>,
    enableStreaming: boolean,
    chapters: ChapterData[],
    ctx: WorkflowGraphAst
  ): Observable<string> {
    const refinePrompt = this.promptBuilder.buildSelfRefinePrompt(draftText, wordCount);
    const tools = this.createTools(chapters, ctx, ast, true);

    // 绑定工具
    const modelWithTools = model.bindTools(tools);

    if (enableStreaming) {
      let accumulatedText = '';
      let lastDeltaEmitTime = 0;
      const DELTA_THROTTLE_MS = 150;

      return this.streamingLlmInvoker.streamWithTools(
        modelWithTools,
        [{ role: 'user', content: refinePrompt }],
        signal,
        true,  // useTools = true，保持工具开启
        tools
      ).pipe(
        tap((chunk: StreamChunk) => {
          if (chunk.type === 'delta' && chunk.delta) {
            accumulatedText += chunk.delta;

            const now = Date.now();
            if ((now - lastDeltaEmitTime) >= DELTA_THROTTLE_MS) {
              streamEventSubject.next({
                type: 'node_delta',
                id: ast.id,
                data: { delta: chunk.delta, accumulated: accumulatedText }
              });
              lastDeltaEmitTime = now;
            }
          }
        }),
        filter((chunk: StreamChunk) => chunk.type === 'complete'),
        map((chunk: StreamChunk) => {
          const finalText = chunk.fullText || accumulatedText;

          streamEventSubject.next({
            type: 'node_delta',
            id: ast.id,
            data: { delta: '', accumulated: finalText }
          });

          console.log(`[selfRefine] 改进完成，长度: ${finalText.length}字`);
          return finalText;
        })
      );
    }

    return this.llmInvoker.invokeWithTools(modelWithTools, [{ role: 'user', content: refinePrompt }], signal, true, tools);
  }

  /**
   * 流式调用并转发事件（含节流）
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

    // 节流控制：减少前端 DOM 更新频率
    let lastDeltaEmitTime = 0;
    const DELTA_THROTTLE_MS = 150; // 150ms = ~6.7fps，肉眼流畅阈值

    return this.streamingLlmInvoker.streamWithTools(model, initialMessages, signal, useTools, tools).pipe(
      tap((chunk: StreamChunk) => {
        if (chunk.type === 'delta' && chunk.delta) {
          // 始终累积文本（不节流）
          accumulatedText += chunk.delta;

          // 节流发送到前端（减少 DOM 更新）
          const now = Date.now();
          const shouldEmit = (now - lastDeltaEmitTime) >= DELTA_THROTTLE_MS;

          if (shouldEmit) {
            streamEventSubject.next({
              type: 'node_delta',
              id: ast.id,
              data: { delta: chunk.delta, accumulated: accumulatedText }
            });
            lastDeltaEmitTime = now;
          }
        } else if (chunk.type === 'tool_progress' && chunk.toolProgress) {
          // 工具进度事件：不节流（保证实时性）
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
          // 工具结果事件：不节流
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

        // 发送最后一次 delta（确保前端显示完整内容）
        streamEventSubject.next({
          type: 'node_delta',
          id: ast.id,
          data: { delta: '', accumulated: finalText }
        });

        return finalText;
      })
    );
  }

  /**
   * 创建工具列表
   */
  createTools(chapters: ChapterData[], ctx: WorkflowGraphAst, ast: StoryWeaverAst, useTools: boolean): StructuredToolInterface[] {
    if (!useTools) return [];

    const chapterTools = this.toolsFactory.createChapterTools(chapters, ast);
    const nodeTools = this.toolsFactory.createNodeTools(ctx, ast.id);
    return [...chapterTools, ...nodeTools];
  }
}
