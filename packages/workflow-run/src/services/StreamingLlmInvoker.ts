import { Injectable } from '@sker/core';
import { Observable, Subject, from, of, throwError, forkJoin } from 'rxjs';
import { concatMap, expand, filter, take, map, catchError, finalize } from 'rxjs/operators';
import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai';
import { Runnable } from '@langchain/core/runnables';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { AIMessage, AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import { StructuredToolInterface } from '@langchain/core/tools';

interface MessageContent {
  role: string;
  content: string;
}

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

interface LlmResponse {
  content: string;
  tool_calls?: ToolCall[];
  [key: string]: unknown;
}

interface ToolMessage {
  role: 'tool';
  content: string;
  tool_call_id: string;
  name: string;
}

interface RoundState {
  messages: Array<MessageContent | LlmResponse | ToolMessage>;
  round: number;
  isDone: boolean;
}

export interface StreamChunk {
  type: 'delta' | 'complete' | 'tool_call'
  delta?: string
  fullText?: string
  toolCalls?: ToolCall[]
}

/**
 * 流式 LLM 调用器
 * 职责：支持实时流式响应和工具调用的混合模式
 */
@Injectable()
export class StreamingLlmInvoker {
  /**
   * 流式调用（支持工具）
   * 返回 Observable<StreamChunk>，实时推送文本片段
   */
  streamWithTools(
    model: ChatOpenAI<ChatOpenAICallOptions> | Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>,
    initialMessages: MessageContent[],
    signal: AbortSignal,
    useTools: boolean,
    tools: StructuredToolInterface[] = []
  ): Observable<StreamChunk> {
    if (!useTools) {
      return this.streamSimple(model, initialMessages, signal);
    }

    // 工具模式：需要完整响应才能判断是否调用工具
    return this.streamWithToolRounds(model, initialMessages, signal, tools);
  }

  /**
   * 简单流式（无工具）
   */
  private streamSimple(
    model: ChatOpenAI<ChatOpenAICallOptions> | Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>,
    messages: MessageContent[],
    signal: AbortSignal
  ): Observable<StreamChunk> {
    return new Observable<StreamChunk>((observer) => {
      let fullText = '';
      let aborted = false;

      const handleAbort = () => {
        aborted = true;
        observer.complete();
      };

      signal.addEventListener('abort', handleAbort);

      from((model.stream as unknown as (messages: unknown, options: unknown) => AsyncIterable<AIMessageChunk>)(messages, { signal }))
        .pipe(
          finalize(() => {
            signal.removeEventListener('abort', handleAbort);
            if (!aborted) {
              observer.next({ type: 'complete', fullText });
              observer.complete();
            }
          })
        )
        .subscribe({
          next: (chunk: AIMessageChunk) => {
            if (aborted) return;

            const delta = chunk.content as string || '';
            if (delta) {
              fullText += delta;
              observer.next({ type: 'delta', delta });
            }
          },
          error: (err) => {
            if (!aborted) {
              observer.error(err);
            }
          }
        });
    });
  }

  /**
   * 多轮工具调用（混合流式 + 批量）
   * 策略：工具调用轮次使用批量模式，最终文本生成使用流式
   */
  private streamWithToolRounds(
    model: ChatOpenAI<ChatOpenAICallOptions> | Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>,
    initialMessages: MessageContent[],
    signal: AbortSignal,
    tools: StructuredToolInterface[]
  ): Observable<StreamChunk> {
    const MAX_ROUNDS = 10;
    const toolMap = new Map(tools.map(tool => [tool.name, tool]));

    const subject = new Subject<StreamChunk>();

    of({ messages: initialMessages, round: 0, isDone: false } as RoundState)
      .pipe(
        expand((state: RoundState) => {
          if (state.isDone || state.round >= MAX_ROUNDS) {
            return of();
          }

          return from((model.invoke as (messages: unknown, options: unknown) => Promise<unknown>)(state.messages, { signal })).pipe(
            concatMap((response: unknown) => {
              const llmResponse = response as LlmResponse;

              if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
                // 有工具调用，继续下一轮
                subject.next({ type: 'tool_call', toolCalls: llmResponse.tool_calls });
                return this.handleToolCalls(llmResponse, state, toolMap);
              }

              // 无工具调用，进入流式输出模式
              return this.streamFinalResponse(model, state.messages, signal, subject).pipe(
                map(() => ({ ...state, isDone: true }))
              );
            }),
            catchError((error) => {
              subject.error(error);
              return throwError(() => error);
            })
          );
        }),
        take(MAX_ROUNDS + 1)
      )
      .subscribe({
        complete: () => subject.complete(),
        error: (err) => subject.error(err)
      });

    return subject.asObservable();
  }

  /**
   * 流式输出最终响应
   */
  private streamFinalResponse(
    model: ChatOpenAI<ChatOpenAICallOptions> | Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>,
    messages: Array<MessageContent | LlmResponse | ToolMessage>,
    signal: AbortSignal,
    subject: Subject<StreamChunk>
  ): Observable<void> {
    return new Observable<void>((observer) => {
      let fullText = '';

      from((model.stream as unknown as (messages: unknown, options: unknown) => AsyncIterable<AIMessageChunk>)(messages, { signal })).subscribe({
        next: (chunk: AIMessageChunk) => {
          const delta = chunk.content as string || '';
          if (delta) {
            fullText += delta;
            subject.next({ type: 'delta', delta });
          }
        },
        error: (err) => {
          subject.error(err);
          observer.error(err);
        },
        complete: () => {
          subject.next({ type: 'complete', fullText });
          observer.next();
          observer.complete();
        }
      });
    });
  }

  private handleToolCalls(
    response: LlmResponse,
    state: RoundState,
    toolMap: Map<string, StructuredToolInterface>
  ): Observable<RoundState> {
    const newMessages = [...state.messages, response];

    const toolExecutions = (response.tool_calls || []).map((toolCall: ToolCall) => {

      const tool = toolMap.get(toolCall.name);
      if (!tool) {
        return of({
          role: 'tool' as const,
          content: `错误：未找到工具 ${toolCall.name}`,
          tool_call_id: toolCall.id,
          name: toolCall.name
        });
      }

      return from(tool.invoke(toolCall.args)).pipe(
        map((result: unknown): ToolMessage => ({
          role: 'tool',
          content: String(result),
          tool_call_id: toolCall.id,
          name: toolCall.name
        })),
        catchError((error): Observable<ToolMessage> => of({
          role: 'tool',
          content: `错误：${error.message}`,
          tool_call_id: toolCall.id,
          name: toolCall.name
        }))
      );
    });

    if (toolExecutions.length === 0) {
      return of({ messages: newMessages, round: state.round + 1, isDone: false });
    }

    return forkJoin(toolExecutions).pipe(
      map((toolResults: ToolMessage[]) => {
        toolResults.forEach(result => newMessages.push(result));
        return { messages: newMessages, round: state.round + 1, isDone: false };
      })
    );
  }
}
