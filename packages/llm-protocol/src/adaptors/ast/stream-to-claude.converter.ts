import type { CodexResponseEvent } from '../types/codex';
import type { OpenAIStreamResponse } from '../types/openai';
import type { ClaudeStreamEvent } from '../types/claude';

export function convertOpenAIStreamToClaude(
    chunk: OpenAIStreamResponse,
    ctx: any
): ClaudeStreamEvent[] {
    const events: ClaudeStreamEvent[] = [];

    if (!ctx.streamState) {
        ctx.streamState = {
            id: '',
            model: '',
            inputTokens: 0,
            outputTokens: 0,
            contentIndex: 0,
            currentToolId: '',
            currentToolName: '',
            toolArgs: '',
            sentStart: false,
            sentContentStart: false,
        };
    }

    const state = ctx.streamState;

    if (!state.sentStart) {
        state.id = chunk.id;
        state.model = chunk.model;
        state.sentStart = true;
        events.push({
            type: 'message_start',
            message: {
                id: state.id,
                type: 'message',
                role: 'assistant',
                model: state.model,
                content: [],
                usage: { input_tokens: 0, output_tokens: 0 },
            },
        });
    }

    for (const choice of chunk.choices) {
        const delta = choice.delta;

        if (delta.content) {
            if (!state.sentContentStart) {
                state.sentContentStart = true;
                events.push({
                    type: 'content_block_start',
                    index: state.contentIndex,
                    content_block: { type: 'text', text: '' },
                });
            }
            events.push({
                type: 'content_block_delta',
                index: state.contentIndex,
                delta: { type: 'text_delta', text: delta.content },
            });
        }

        if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
                if (tc.id && tc.function?.name) {
                    if (state.sentContentStart) {
                        events.push({ type: 'content_block_stop', index: state.contentIndex });
                        state.contentIndex++;
                        state.sentContentStart = false;
                    }
                    state.currentToolId = tc.id;
                    state.currentToolName = tc.function.name;
                    state.toolArgs = '';
                    events.push({
                        type: 'content_block_start',
                        index: state.contentIndex,
                        content_block: { type: 'tool_use', id: tc.id, name: tc.function.name, input: {} },
                    });
                }
                if (tc.function?.arguments) {
                    state.toolArgs += tc.function.arguments;
                    events.push({
                        type: 'content_block_delta',
                        index: state.contentIndex,
                        delta: { type: 'input_json_delta', partial_json: tc.function.arguments },
                    });
                }
            }
        }

        if (choice.finish_reason) {
            events.push({ type: 'content_block_stop', index: state.contentIndex });
            const stopReason = choice.finish_reason === 'tool_calls' ? 'tool_use' : choice.finish_reason === 'length' ? 'max_tokens' : 'end_turn';
            events.push({
                type: 'message_delta',
                delta: { stop_reason: stopReason },
                usage: { output_tokens: chunk.usage?.completion_tokens ?? 0 },
            });
            events.push({ type: 'message_stop' });
        }
    }

    return events;
}

export function convertCodexStreamToClaude(
    event: CodexResponseEvent,
    ctx: any
): ClaudeStreamEvent | null {
    if (!ctx.messageId) {
        ctx.messageId = `msg_${Date.now()}`;
        ctx.model = 'claude-3-5-sonnet-20241022';
        ctx.contentBlockIndex = 0;
    }

    switch (event.type) {
        case 'response.created':
            return {
                type: 'message_start',
                message: {
                    id: ctx.messageId,
                    type: 'message',
                    role: 'assistant',
                    content: [],
                    model: ctx.model,
                    usage: {
                        input_tokens: 0,
                        output_tokens: 0,
                    },
                },
            };

        case 'response.output_item.added':
            if (event.item.type === 'function_call') {
                const contentBlock = {
                    type: 'tool_use' as const,
                    id: event.item.call_id,
                    name: event.item.name,
                    input: JSON.parse(event.item.arguments || '{}'),
                };

                return {
                    type: 'content_block_start',
                    index: ctx.contentBlockIndex++,
                    content_block: contentBlock,
                };
            } else if (event.item.type === 'message') {
                return {
                    type: 'content_block_start',
                    index: ctx.contentBlockIndex++,
                    content_block: {
                        type: 'text',
                        text: '',
                    },
                };
            }
            return null;

        case 'response.output_text.delta':
            return {
                type: 'content_block_delta',
                index: ctx.contentBlockIndex - 1 || 0,
                delta: {
                    type: 'text_delta',
                    text: event.delta,
                },
            };

        case 'response.output_item.done':
            return {
                type: 'content_block_stop',
                index: ctx.contentBlockIndex - 1 || 0,
            };

        case 'response.reasoning_summary_text.delta':
        case 'response.reasoning_text.delta':
            return {
                type: 'content_block_delta',
                index: ctx.contentBlockIndex - 1 || 0,
                delta: {
                    type: 'text_delta',
                    text: event.delta,
                },
            };

        case 'response.completed':
            if (event.token_usage) {
                ctx.finalUsage = {
                    input_tokens: event.token_usage.input_tokens,
                    output_tokens: event.token_usage.output_tokens,
                };
            }

            return {
                type: 'message_stop',
            };

        case 'response.failed':
            return {
                type: 'message_stop',
            };

        case 'response.reasoning_summary_part.added':
        case 'rate_limits':
            return null;

        default:
            return null;
    }
}
