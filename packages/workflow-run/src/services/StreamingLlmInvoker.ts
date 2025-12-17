import { Injectable } from '@sker/core';
import { Observable, Subject, from, of, throwError, forkJoin } from 'rxjs';
import { concatMap, expand, filter, take, map, catchError, finalize } from 'rxjs/operators';

export interface StreamChunk {
  type: 'delta' | 'complete' | 'tool_call'
  delta?: string
  fullText?: string
  toolCalls?: any[]
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
    model: any,
    initialMessages: Array<{ role: string; content: string }>,
    signal: AbortSignal,
    useTools: boolean,
    tools: any[] = []
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
    model: any,
    messages: any[],
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

      from(model.stream(messages, { signal }))
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
          next: (chunk: any) => {
            if (aborted) return;

            const delta = chunk.content || chunk.text || '';
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
    model: any,
    initialMessages: any[],
    signal: AbortSignal,
    tools: any[]
  ): Observable<StreamChunk> {
    const MAX_ROUNDS = 10;
    const toolMap = new Map(tools.map(tool => [tool.name, tool]));

    interface RoundState {
      messages: any[];
      round: number;
      isDone: boolean;
    }

    const subject = new Subject<StreamChunk>();

    of({ messages: initialMessages, round: 0, isDone: false } as RoundState)
      .pipe(
        expand((state: RoundState) => {
          if (state.isDone || state.round >= MAX_ROUNDS) {
            return of();
          }

          console.log(`[StreamingLlmInvoker] 工具调用轮次 ${state.round + 1}/${MAX_ROUNDS}`);

          // 工具调用轮次：必须使用 invoke 获取完整响应
          return from(model.invoke(state.messages, { signal })).pipe(
            concatMap((response: any) => {
              if (response.tool_calls && response.tool_calls.length > 0) {
                // 有工具调用，继续下一轮
                subject.next({ type: 'tool_call', toolCalls: response.tool_calls });
                return this.handleToolCalls(response, state, toolMap);
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
    model: any,
    messages: any[],
    signal: AbortSignal,
    subject: Subject<StreamChunk>
  ): Observable<void> {
    return new Observable<void>((observer) => {
      let fullText = '';

      from(model.stream(messages, { signal })).subscribe({
        next: (chunk: any) => {
          const delta = chunk.content || chunk.text || '';
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
          console.log(`[StreamingLlmInvoker] 流式输出完成（${fullText.length} 字）`);
          subject.next({ type: 'complete', fullText });
          observer.next();
          observer.complete();
        }
      });
    });
  }

  private handleToolCalls(
    response: any,
    state: { messages: any[]; round: number; isDone: boolean },
    toolMap: Map<string, any>
  ): Observable<{ messages: any[]; round: number; isDone: boolean }> {
    console.log(`[StreamingLlmInvoker] LLM 请求调用 ${response.tool_calls.length} 个工具`);

    const newMessages = [...state.messages, response];

    const toolExecutions = response.tool_calls.map((toolCall: any) => {
      console.log(`[StreamingLlmInvoker] 执行工具: ${toolCall.name}`);

      const tool = toolMap.get(toolCall.name);
      if (!tool) {
        return of({
          role: 'tool',
          content: `错误：未找到工具 ${toolCall.name}`,
          tool_call_id: toolCall.id,
          name: toolCall.name
        });
      }

      return from(tool.invoke(toolCall.args)).pipe(
        map((result: any) => ({
          role: 'tool',
          content: String(result),
          tool_call_id: toolCall.id,
          name: toolCall.name
        })),
        catchError((error) => of({
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

    return (forkJoin(toolExecutions) as Observable<any[]>).pipe(
      map((toolResults: any[]) => {
        toolResults.forEach(result => newMessages.push(result));
        return { messages: newMessages, round: state.round + 1, isDone: false };
      })
    );
  }
}
