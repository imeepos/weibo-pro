import type { ClaudeStreamEvent } from '../types/claude';
import type { CodexResponseEvent } from '../types/codex';
import type { OpenAIStreamResponse } from '../types/openai';

/**
 * 将 Claude SSE 流事件转换为 OpenAI 流式响应分片
 */
export function convertClaudeStreamToOpenAI(
    event: ClaudeStreamEvent,
    ctx: any
): OpenAIStreamResponse | null {
    if (!ctx.streamState) {
        ctx.streamState = {
            id: '',
            model: '',
            created: 0,
            toolCallIndex: -1,
            toolCallArgs: new Map<number, string>(),
        };
    }

    const state = ctx.streamState;

    if (event.type === 'ping') return null;

    if (event.type === 'message_start') {
        state.id = event.message.id;
        state.model = event.message.model;
        state.created = Math.floor(Date.now() / 1000);
        return {
            id: state.id,
            object: 'chat.completion.chunk' as const,
            created: state.created,
            model: state.model,
            choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
        };
    }

    if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
            state.toolCallIndex++;
            state.toolCallArgs.set(state.toolCallIndex, '');
            return {
                id: state.id,
                object: 'chat.completion.chunk' as const,
                created: state.created,
                model: state.model,
                choices: [
                    {
                        index: 0,
                        delta: {
                            tool_calls: [{
                                id: event.content_block.id,
                                type: 'function' as const,
                                function: { name: event.content_block.name, arguments: '' }
                            }],
                        },
                        finish_reason: null,
                    },
                ],
            };
        }
        return null;
    }

    if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
            return {
                id: state.id,
                object: 'chat.completion.chunk' as const,
                created: state.created,
                model: state.model,
                choices: [{ index: 0, delta: { content: event.delta.text }, finish_reason: null }],
            };
        }
        if (event.delta.type === 'input_json_delta') {
            return {
                id: state.id,
                object: 'chat.completion.chunk' as const,
                created: state.created,
                model: state.model,
                choices: [
                    {
                        index: 0,
                        delta: { tool_calls: [{ index: state.toolCallIndex, function: { arguments: event.delta.partial_json } }] },
                        finish_reason: null,
                    },
                ],
            };
        }
    }

    if (event.type === 'message_delta') {
        const reason = event.delta.stop_reason;
        const finishReason = reason === 'end_turn' ? 'stop' : reason === 'tool_use' ? 'tool_calls' : reason === 'max_tokens' ? 'length' : null;
        return {
            id: state.id,
            object: 'chat.completion.chunk' as const,
            created: state.created,
            model: state.model,
            choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
            usage: { prompt_tokens: 0, completion_tokens: event.usage.output_tokens, total_tokens: event.usage.output_tokens },
        };
    }

    return null;
}

/**
 * 将 Codex SSE 流事件转换为 OpenAI 流式响应分片
 */
export function convertCodexStreamToOpenAI(
    event: CodexResponseEvent,
    ctx: any
): OpenAIStreamResponse | null {
    if (!ctx.streamId) {
        ctx.streamId = `chatcmpl_${Date.now()}`;
        ctx.model = 'gpt-4';
        ctx.created = Math.floor(Date.now() / 1000);
    }

    const baseResponse = {
        id: ctx.streamId,
        object: 'chat.completion.chunk' as const,
        created: ctx.created,
        model: ctx.model,
        choices: [] as any[],
    };

    switch (event.type) {
        case 'response.created':
            return {
                ...baseResponse,
                choices: [{
                    index: 0,
                    delta: { role: 'assistant' },
                    finish_reason: null,
                }],
            };

        case 'response.output_text.delta':
            return {
                ...baseResponse,
                choices: [{
                    index: 0,
                    delta: { content: event.delta },
                    finish_reason: null,
                }],
            };

        case 'response.output_item.added':
            if (event.item.type === 'function_call') {
                return {
                    ...baseResponse,
                    choices: [{
                        index: 0,
                        delta: {
                            tool_calls: [{
                                index: 0,
                                id: event.item.call_id,
                                type: 'function' as const,
                                function: {
                                    name: event.item.name,
                                    arguments: event.item.arguments,
                                },
                            }],
                        },
                        finish_reason: null,
                    }],
                };
            }
            return null;

        case 'response.output_item.done':
            return null;

        case 'response.completed':
            return {
                ...baseResponse,
                choices: [{
                    index: 0,
                    delta: {},
                    finish_reason: 'stop',
                }],
                usage: event.token_usage ? {
                    prompt_tokens: event.token_usage.input_tokens,
                    completion_tokens: event.token_usage.output_tokens,
                    total_tokens: event.token_usage.total_tokens,
                } : undefined,
            };

        case 'response.failed':
            return {
                ...baseResponse,
                choices: [{
                    index: 0,
                    delta: {},
                    finish_reason: 'content_filter',
                }],
            };

        case 'response.reasoning_summary_text.delta':
        case 'response.reasoning_text.delta':
            return {
                ...baseResponse,
                choices: [{
                    index: 0,
                    delta: { content: event.delta },
                    finish_reason: null,
                }],
            };

        case 'response.reasoning_summary_part.added':
        case 'rate_limits':
            return null;

        default:
            return null;
    }
}
