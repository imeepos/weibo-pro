import { Injectable } from '@sker/core';
import { Observable, Subject, from, of, throwError, forkJoin } from 'rxjs';
import { concatMap, expand, take, map, catchError, finalize } from 'rxjs/operators';
import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai';
import { Runnable } from '@langchain/core/runnables';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { AIMessageChunk } from '@langchain/core/messages';
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
  type: 'delta' | 'complete' | 'tool_call' | 'tool_progress' | 'tool_result'
  delta?: string
  fullText?: string
  toolCalls?: ToolCall[]
  toolProgress?: {
    round: number
    totalRounds?: number
    currentTool: string
    status: 'executing' | 'completed'
    message: string
  }
  toolResult?: {
    toolName: string
    resultSummary: string
    resultLength: number
  }
}

/**
 * 通用流式 LLM 调用器
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
    if (!useTools || tools.length === 0) {
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

      from((model.stream as any)(messages, { signal }) as AsyncIterable<AIMessageChunk>)
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
          next: (chunk) => {
            if (aborted) return;

            const delta = (chunk as AIMessageChunk).content as string || '';
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
    const toolMap = new Map(tools.map(tool => [tool.name, tool]));
    const subject = new Subject<StreamChunk>();

    of({ messages: initialMessages, round: 0, isDone: false } as RoundState)
      .pipe(
        expand((state: RoundState) => {
          if (state.isDone) {
            return of();
          }

          return from(this.invokeModel(model, state.messages, signal)).pipe(
            concatMap((response: LlmResponse) => {
              if (response.tool_calls && response.tool_calls.length > 0) {
                subject.next({ type: 'tool_call', toolCalls: response.tool_calls });

                // 发送工具执行进度
                const toolNames = response.tool_calls.map(tc => tc.name).join('、');
                subject.next({
                  type: 'tool_progress',
                  toolProgress: {
                    round: state.round + 1,
                    currentTool: toolNames,
                    status: 'executing',
                    message: `正在执行: ${toolNames}`
                  }
                });

                return this.handleToolCalls(response, state, toolMap, subject);
              }

              // 无工具调用，进入流式输出
              return this.streamFinalResponse(model, [...state.messages, response], signal, subject).pipe(
                map(() => ({ ...state, isDone: true }))
              );
            }),
            catchError((error) => {
              subject.error(error);
              return throwError(() => error);
            })
          );
        })
      )
      .subscribe({
        complete: () => subject.complete(),
        error: (err) => subject.error(err)
      });

    return subject.asObservable();
  }

  /**
   * 调用模型（批量）
   */
  private async invokeModel(
    model: ChatOpenAI<ChatOpenAICallOptions> | Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>,
    messages: Array<MessageContent | LlmResponse | ToolMessage>,
    signal: AbortSignal
  ): Promise<LlmResponse> {
    try {
      const response = await (model.invoke as any)(messages, { signal })
      return response as LlmResponse
    } catch (error) {
      // 增强 LangChain 错误信息，便于调试
      const messagesStr = JSON.stringify(messages).slice(0, 200)
      console.error('[StreamingLlmInvoker] invokeModel 失败:')
      console.error('  消息预览:', messagesStr.length > 200 ? `${messagesStr.slice(0, 100)}...${messagesStr.slice(-100)}` : messagesStr)
      console.error('  错误:', error instanceof Error ? error.message : String(error))
      if (error instanceof Error && error.cause) {
        console.error('  原因:', error.cause)
      }
      throw error
    }
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

      from((model.stream as any)(messages, { signal }) as AsyncIterable<AIMessageChunk>).subscribe({
        next: (chunk) => {
          const delta = (chunk as AIMessageChunk).content as string || '';
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

  /**
   * 处理工具调用
   */
  private handleToolCalls(
    response: LlmResponse,
    state: RoundState,
    toolMap: Map<string, StructuredToolInterface>,
    subject: Subject<StreamChunk>
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
        map((result: unknown): ToolMessage => {
          const resultStr = String(result);

          subject.next({
            type: 'tool_result',
            toolResult: {
              toolName: toolCall.name,
              resultSummary: `${toolCall.name} 完成`,
              resultLength: resultStr.length
            }
          });

          return {
            role: 'tool',
            content: resultStr,
            tool_call_id: toolCall.id,
            name: toolCall.name
          };
        }),
        catchError((error): Observable<ToolMessage> => {
          return of({
            role: 'tool',
            content: `错误：${error.message}`,
            tool_call_id: toolCall.id,
            name: toolCall.name
          });
        })
      );
    });

    // ForkJoin 所有工具执行
    return forkJoin(toolExecutions).pipe(
      map((toolResults: ToolMessage[]) => {
        toolResults.forEach(result => {
          newMessages.push(result);
        });

        subject.next({
          type: 'tool_progress',
          toolProgress: {
            round: state.round + 1,
            currentTool: '工具调用',
            status: 'completed',
            message: '工具调用完成'
          }
        });

        return { messages: newMessages, round: state.round + 1, isDone: false };
      })
    );
  }
}
