import { Injectable } from '@sker/core';
import { Observable, from, of, throwError, forkJoin } from 'rxjs';
import { concatMap, expand, filter, take, map, catchError } from 'rxjs/operators';
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
  finalText: string | null;
}

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
    model: ChatOpenAI<ChatOpenAICallOptions> | Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>,
    initialMessages: MessageContent[],
    signal: AbortSignal,
    useTools: boolean,
    tools: StructuredToolInterface[] = []
  ): Observable<string> {
    if (!useTools) {
      return from((model.invoke as unknown as (messages: unknown, options: unknown) => Promise<LlmResponse>)(initialMessages, { signal })).pipe(
        map((response: LlmResponse) => response.content || String(response))
      );
    }

    const MAX_ROUNDS = 10;
    const toolMap = new Map(tools.map(tool => [tool.name, tool]));

    return of({ messages: initialMessages, round: 0, finalText: null } as RoundState).pipe(
      expand((state: RoundState) => {
        if (state.finalText !== null || state.round >= MAX_ROUNDS) {
          return of();
        }

        console.log(`[LlmInvoker] 工具调用轮次 ${state.round + 1}/${MAX_ROUNDS}`);

        return from((model.invoke as unknown as (messages: unknown, options: unknown) => Promise<LlmResponse>)(state.messages, { signal })).pipe(
          concatMap((response: LlmResponse) => {
            if (response.tool_calls && response.tool_calls.length > 0) {
              return this.handleToolCalls(response, state, toolMap);
            }

            const finalText = response.content || String(response);
            console.log(`[LlmInvoker] 工具调用完成，获得最终文本（${finalText.length} 字）`);

            return of({
              messages: state.messages,
              round: state.round + 1,
              finalText
            });
          }),
          catchError((error: Error) => {
            // 详细的错误诊断
            const errorInfo = {
              轮次: state.round + 1,
              错误类型: error.name || 'Unknown',
              状态码: (error as { status?: number }).status,
              消息: error.message
            }

            // 检测是否是 tools 相关错误
            if ((error as { status?: number }).status === 400 && useTools) {
              console.error(`[LlmInvoker] ⚠️ Tools 调用失败（Provider 可能不支持）:`, {
                ...errorInfo,
                可能原因: '该 LLM Provider 可能不支持 function calling (tools)',
                建议: [
                  '1. 检查 LLM Provider 是否支持 tools/function calling',
                  '2. 更换支持 function calling 的 Provider',
                  '3. 或减少章节数量以禁用工具模式（当前阈值：>10章启用工具）'
                ]
              })
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
    response: LlmResponse,
    state: RoundState,
    toolMap: Map<string, StructuredToolInterface>
  ): Observable<RoundState> {
    console.log(`[LlmInvoker] LLM 请求调用 ${response.tool_calls?.length || 0} 个工具`);

    const newMessages = [...state.messages, response];

    const toolExecutions = (response.tool_calls || []).map((toolCall: ToolCall) => {
      console.log(`[LlmInvoker] 执行工具: ${toolCall.name}，参数: ${JSON.stringify(toolCall.args)}`);

      const tool = toolMap.get(toolCall.name);
      if (!tool) {
        console.error(`[LlmInvoker] 未找到工具: ${toolCall.name}`);
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
        catchError((error: Error): Observable<ToolMessage> => {
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

    return forkJoin(toolExecutions).pipe(
      map((toolResults: ToolMessage[]) => {
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
