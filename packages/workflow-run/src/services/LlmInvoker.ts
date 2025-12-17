import { Injectable } from '@sker/core';
import { Observable, from, of, throwError, forkJoin } from 'rxjs';
import { concatMap, expand, filter, take, map, catchError } from 'rxjs/operators';

/**
 * LLM 调用器
 * 职责：处理 LLM 调用和多轮工具对话
 */
@Injectable()
export class LlmInvoker {
  /**
   * 支持工具调用的多轮对话
   *
   * 处理流程：
   * 1. 发送初始消息给 LLM
   * 2. 检查响应是否包含工具调用
   * 3. 如果有工具调用，执行工具并将结果添加到消息历史
   * 4. 重复步骤 1-3，直到 LLM 返回最终文本内容（无工具调用）
   * 5. 返回最终文本内容
   */
  invokeWithTools(
    model: any,
    initialMessages: Array<{ role: string; content: string }>,
    signal: AbortSignal,
    useTools: boolean,
    tools: any[] = []
  ): Observable<string> {
    if (!useTools) {
      return from(model.invoke(initialMessages, { signal })).pipe(
        map((response: any) => response.content || response.text || String(response))
      );
    }

    const MAX_ROUNDS = 10;
    const toolMap = new Map(tools.map(tool => [tool.name, tool]));

    interface RoundState {
      messages: any[];
      round: number;
      finalText: string | null;
    }

    return of({ messages: initialMessages, round: 0, finalText: null } as RoundState).pipe(
      expand((state: RoundState) => {
        if (state.finalText !== null || state.round >= MAX_ROUNDS) {
          return of();
        }

        console.log(`[LlmInvoker] 工具调用轮次 ${state.round + 1}/${MAX_ROUNDS}`);

        return from(model.invoke(state.messages, { signal })).pipe(
          concatMap((response: any) => {
            if (response.tool_calls && response.tool_calls.length > 0) {
              return this.handleToolCalls(response, state, toolMap);
            }

            const finalText = response.content || response.text || String(response);
            console.log(`[LlmInvoker] 工具调用完成，获得最终文本（${finalText.length} 字）`);

            return of({
              messages: state.messages,
              round: state.round + 1,
              finalText
            });
          }),
          catchError((error) => {
            // 详细的错误诊断
            const errorInfo: any = {
              轮次: state.round + 1,
              错误类型: error.name || 'Unknown',
              状态码: error.status,
              消息: error.message
            }

            // 检测是否是 tools 相关错误
            if (error.status === 400 && useTools) {
              errorInfo.可能原因 = '该 LLM Provider 可能不支持 function calling (tools)'
              errorInfo.建议 = [
                '1. 检查 LLM Provider 是否支持 tools/function calling',
                '2. 更换支持 function calling 的 Provider',
                '3. 或减少章节数量以禁用工具模式（当前阈值：>10章启用工具）'
              ]
              console.error(`[LlmInvoker] ⚠️ Tools 调用失败（Provider 可能不支持）:`, errorInfo)
            } else {
              console.error(`[LlmInvoker] 工具调用轮次 ${state.round + 1} 失败:`, errorInfo)
            }

            return throwError(() => error);
          })
        );
      }),
      filter((state: RoundState) => state.finalText !== null),
      take(1),
      map((state: RoundState) => {
        if (state.finalText === null) {
          throw new Error(`工具调用未能在 ${MAX_ROUNDS} 轮内完成`);
        }
        return state.finalText;
      })
    );
  }

  private handleToolCalls(
    response: any,
    state: { messages: any[]; round: number; finalText: string | null },
    toolMap: Map<string, any>
  ): Observable<{ messages: any[]; round: number; finalText: string | null }> {
    console.log(`[LlmInvoker] LLM 请求调用 ${response.tool_calls.length} 个工具`);

    const newMessages = [...state.messages, response];

    const toolExecutions = response.tool_calls.map((toolCall: any) => {
      console.log(`[LlmInvoker] 执行工具: ${toolCall.name}，参数: ${JSON.stringify(toolCall.args)}`);

      const tool = toolMap.get(toolCall.name);
      if (!tool) {
        console.error(`[LlmInvoker] 未找到工具: ${toolCall.name}`);
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
        catchError((error) => {
          console.error(`[LlmInvoker] 工具执行失败: ${toolCall.name}`, error);
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
      return of({
        messages: newMessages,
        round: state.round + 1,
        finalText: null
      });
    }

    return (forkJoin(toolExecutions) as Observable<any[]>).pipe(
      map((toolResults: any[]) => {
        toolResults.forEach(result => newMessages.push(result));

        return {
          messages: newMessages,
          round: state.round + 1,
          finalText: null
        };
      })
    );
  }
}
