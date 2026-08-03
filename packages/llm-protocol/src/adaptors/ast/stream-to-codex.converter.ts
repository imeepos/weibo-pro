import type { ClaudeStreamEvent } from '../types/claude';
import type { CodexResponseEvent } from '../types/codex';
import type { OpenAIStreamResponse } from '../types/openai';

/**
 * 将 OpenAI 流式响应转换为 Codex 流式事件
 */
export function convertOpenAIStreamToCodex(
    stream: OpenAIStreamResponse,
    ctx: any
): CodexResponseEvent | null {
    if (!ctx.streamState) {
        ctx.streamState = {
            assistantItemId: `item_${Date.now()}`,
            createdSent: false,
            toolCalls: new Map<number, { id: string; name: string; arguments: string }>(),
        };
    }

    const state = ctx.streamState;

    if (!state.createdSent) {
        state.createdSent = true;
        return {
            type: 'response.created',
        };
    }

    if (!stream.choices || stream.choices.length === 0) {
        return null;
    }

    const choice = stream.choices[0]!;
    const delta = choice.delta;

    if (delta.content) {
        return {
            type: 'response.output_text.delta',
            delta: delta.content,
        };
    }

    if (delta.tool_calls) {
        for (const toolCall of delta.tool_calls) {
            const index = toolCall.index ?? 0;

            if (!state.toolCalls.has(index)) {
                state.toolCalls.set(index, {
                    id: toolCall.id || `call_${Date.now()}_${index}`,
                    name: toolCall.function?.name || '',
                    arguments: toolCall.function?.arguments || '',
                });

                return {
                    type: 'response.output_item.added',
                    item: {
                        type: 'function_call',
                        name: state.toolCalls.get(index)!.name,
                        arguments: state.toolCalls.get(index)!.arguments,
                        call_id: state.toolCalls.get(index)!.id,
                    },
                };
            } else {
                const existing = state.toolCalls.get(index)!;
                if (toolCall.function?.arguments) {
                    existing.arguments += toolCall.function.arguments;
                }
            }
        }
    }

    if (choice.finish_reason) {
        return {
            type: 'response.completed',
            response_id: stream.id,
            token_usage: stream.usage ? {
                input_tokens: stream.usage.prompt_tokens,
                cached_input_tokens: 0,
                output_tokens: stream.usage.completion_tokens,
                reasoning_output_tokens: 0,
                total_tokens: stream.usage.total_tokens,
            } : undefined,
        };
    }

    return null;
}

/**
 * 将 Claude 流式事件转换为 Codex 流式事件
 */
export function convertClaudeStreamToCodex(
    event: ClaudeStreamEvent,
    ctx: any
): CodexResponseEvent | null {
    switch (event.type) {
        case 'message_start':
            return {
                type: 'response.created',
            };

        case 'content_block_start':
            if (event.content_block?.type === 'tool_use') {
                return {
                    type: 'response.output_item.added',
                    item: {
                        type: 'function_call',
                        name: event.content_block.name,
                        arguments: JSON.stringify(event.content_block.input || {}),
                        call_id: event.content_block.id,
                    },
                };
            }
            return null;

        case 'content_block_delta':
            if (event.delta?.type === 'text_delta') {
                return {
                    type: 'response.output_text.delta',
                    delta: event.delta.text,
                };
            }
            if (event.delta?.type === 'input_json_delta') {
                return null;
            }
            return null;

        case 'content_block_stop':
            return null;

        case 'message_delta':
            return null;

        case 'message_stop': {
            const messageId = ctx.messageId || `msg_${Date.now()}`;
            return {
                type: 'response.completed',
                response_id: messageId,
                token_usage: ctx.usage ? {
                    input_tokens: ctx.usage.input_tokens || 0,
                    cached_input_tokens: ctx.usage.cache_read_input_tokens || 0,
                    output_tokens: ctx.usage.output_tokens || 0,
                    reasoning_output_tokens: 0,
                    total_tokens: (ctx.usage.input_tokens || 0) + (ctx.usage.output_tokens || 0),
                } : undefined,
            };
        }

        case 'ping':
            return null;

        default:
            return null;
    }
}
