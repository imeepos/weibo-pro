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

          console.log(`[StreamingLlmInvoker] 开始第 ${state.round + 1} 轮调用，消息数: ${state.messages.length}`);

          return from((model.invoke as (messages: unknown, options: unknown) => Promise<unknown>)(state.messages, { signal })).pipe(
            concatMap((response: unknown) => {
              const llmResponse = response as LlmResponse;

              console.log(`[StreamingLlmInvoker] 第 ${state.round + 1} 轮响应:`, {
                hasToolCalls: !!(llmResponse.tool_calls && llmResponse.tool_calls.length > 0),
                toolCallsCount: llmResponse.tool_calls?.length || 0,
                contentLength: llmResponse.content?.length || 0,
                contentPreview: llmResponse.content?.slice(0, 200)
              });

              if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
                // 有工具调用，继续下一轮
                console.log(`[StreamingLlmInvoker] 检测到工具调用:`, llmResponse.tool_calls.map(tc => tc.name));

                // 发送工具调用事件（带工具名称信息）
                subject.next({ type: 'tool_call', toolCalls: llmResponse.tool_calls });

                // 发送工具执行进度
                const toolNames = llmResponse.tool_calls.map(tc => {
                  const displayNames: Record<string, string> = {
                    'list_chapters': '正在查询章节列表',
                    'retrieve_chapter': '正在检索章节内容',
                    'search_content': '正在搜索相关内容'
                  };
                  return displayNames[tc.name] || `正在执行 ${tc.name}`;
                }).join('、');

                subject.next({
                  type: 'tool_progress',
                  toolProgress: {
                    round: state.round + 1,
                    currentTool: toolNames,
                    status: 'executing',
                    message: `第 ${state.round + 1} 轮：${toolNames}...`
                  }
                });

                return this.handleToolCalls(llmResponse, state, toolMap, subject);
              }

              // 无工具调用，进入流式输出模式
              console.log(`[StreamingLlmInvoker] 无工具调用，准备输出最终内容`);

              // 发送开始创作的进度消息
              subject.next({
                type: 'tool_progress',
                toolProgress: {
                  round: state.round + 1,
                  currentTool: '章节创作',
                  status: 'executing',
                  message: '工具调用完成，开始创作章节内容...'
                }
              });

              // 检查响应中是否已经包含内容
              if (llmResponse.content && typeof llmResponse.content === 'string' && llmResponse.content.trim().length > 0) {
                console.log(`[StreamingLlmInvoker] 响应中已包含完整内容，长度: ${llmResponse.content.length}`);

                // 将内容分段推送（模拟流式）
                const content = llmResponse.content;
                const chunkSize = 50;
                for (let i = 0; i < content.length; i += chunkSize) {
                  const delta = content.slice(i, i + chunkSize);
                  subject.next({ type: 'delta', delta });
                }

                // 发送完成事件
                subject.next({ type: 'complete', fullText: content });

                return of({ ...state, isDone: true });
              }

              // 如果没有内容，尝试流式调用
              console.log(`[StreamingLlmInvoker] 响应中无内容，尝试流式调用`);

              // 将当前 LLM 响应添加到消息历史
              const messagesWithResponse = [...state.messages, llmResponse];

              // 检查最后一条消息是否为 tool 角色，如果是，添加提示消息
              const lastMessage = messagesWithResponse[messagesWithResponse.length - 1];
              if (lastMessage && 'role' in lastMessage && lastMessage.role === 'tool') {
                console.log(`[StreamingLlmInvoker] 最后一条消息是 tool 角色，添加提示消息`);
                messagesWithResponse.push({
                  role: 'user',
                  content: '请基于上述工具调用结果，完成章节内容的创作。'
                });
              }

              return this.streamFinalResponse(model, messagesWithResponse, signal, subject).pipe(
                map(() => ({ ...state, isDone: true }))
              );
            }),
            catchError((error) => {
              console.error(`[StreamingLlmInvoker] 第 ${state.round + 1} 轮调用失败:`, error);
              subject.error(error);
              return throwError(() => error);
            })
          );
        }),
        take(MAX_ROUNDS + 1)
      )
      .subscribe({
        complete: () => {
          console.log(`[StreamingLlmInvoker] 工具调用流程完成`);
          subject.complete();
        },
        error: (err) => {
          console.error(`[StreamingLlmInvoker] 工具调用流程错误:`, err);
          subject.error(err);
        }
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
      let chunkCount = 0;

      console.log(`[StreamingLlmInvoker] 开始流式输出最终响应，消息数: ${messages.length}`);

      from((model.stream as unknown as (messages: unknown, options: unknown) => AsyncIterable<AIMessageChunk>)(messages, { signal })).subscribe({
        next: (chunk: AIMessageChunk) => {
          const delta = chunk.content as string || '';
          if (delta) {
            fullText += delta;
            chunkCount++;
            subject.next({ type: 'delta', delta });

            if (chunkCount % 10 === 0) {
              console.log(`[StreamingLlmInvoker] 已接收 ${chunkCount} 个 chunk，累计文本长度: ${fullText.length}`);
            }
          }
        },
        error: (err) => {
          console.error(`[StreamingLlmInvoker] 流式响应错误:`, err);
          subject.error(err);
          observer.error(err);
        },
        complete: () => {
          console.log(`[StreamingLlmInvoker] 流式响应完成，总 chunk 数: ${chunkCount}，最终文本长度: ${fullText.length}`);
          console.log(`[StreamingLlmInvoker] 最终文本预览: ${fullText.slice(0, 200)}...`);
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
    toolMap: Map<string, StructuredToolInterface>,
    subject: Subject<StreamChunk>
  ): Observable<RoundState> {
    const newMessages = [...state.messages, response];

    console.log(`[StreamingLlmInvoker] 处理 ${response.tool_calls?.length || 0} 个工具调用`);

    const toolExecutions = (response.tool_calls || []).map((toolCall: ToolCall) => {
      console.log(`[StreamingLlmInvoker] 执行工具: ${toolCall.name}，参数:`, toolCall.args);

      const tool = toolMap.get(toolCall.name);
      if (!tool) {
        console.warn(`[StreamingLlmInvoker] 未找到工具: ${toolCall.name}`);
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
          console.log(`[StreamingLlmInvoker] 工具 ${toolCall.name} 返回结果长度: ${resultStr.length}`);
          console.log(`[StreamingLlmInvoker] 工具 ${toolCall.name} 结果预览: ${resultStr.slice(0, 200)}...`);

          // 生成结果摘要
          let resultSummary = '';
          if (toolCall.name === 'list_chapters') {
            try {
              const chapters = JSON.parse(resultStr);
              resultSummary = `查询到 ${chapters.length} 个章节`;
            } catch {
              resultSummary = '章节列表已获取';
            }
          } else if (toolCall.name === 'retrieve_chapter') {
            const chapterNum = (toolCall.args as any).chapterNumber;
            resultSummary = `已检索第 ${chapterNum} 章内容`;
          } else if (toolCall.name === 'search_content') {
            try {
              const searchResult = JSON.parse(resultStr);
              const matchCount = Array.isArray(searchResult) ? searchResult.length : 0;
              resultSummary = `找到 ${matchCount} 处匹配`;
            } catch {
              resultSummary = '搜索完成';
            }
          } else {
            resultSummary = `${toolCall.name} 执行完成`;
          }

          // 发送工具结果事件
          subject.next({
            type: 'tool_result',
            toolResult: {
              toolName: toolCall.name,
              resultSummary,
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
          console.error(`[StreamingLlmInvoker] 工具 ${toolCall.name} 执行失败:`, error);
          return of({
            role: 'tool',
            content: `错误：${error.message}`,
            tool_call_id: toolCall.id,
            name: toolCall.name
          });
        })
      );
    });

    if (toolExecutions.length === 0) {
      return of({ messages: newMessages, round: state.round + 1, isDone: false });
    }

    return forkJoin(toolExecutions).pipe(
      map((toolResults: ToolMessage[]) => {
        toolResults.forEach(result => {
          console.log(`[StreamingLlmInvoker] 添加工具消息: ${result.name}`);
          newMessages.push(result);
        });

        // 发送工具完成进度
        subject.next({
          type: 'tool_progress',
          toolProgress: {
            round: state.round + 1,
            currentTool: '工具调用',
            status: 'completed',
            message: `第 ${state.round + 1} 轮工具调用完成，准备下一轮...`
          }
        });

        return { messages: newMessages, round: state.round + 1, isDone: false };
      })
    );
  }
}
