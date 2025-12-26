import { Injectable } from '@sker/core';
import { BaseVisitor } from './visitor';
import type {
    CodexRequest,
    CodexResponse,
    CodexResponseEvent,
    CodexMessageInput,
    CodexContent,
    CodexInputText,
    CodexOutputText,
    CodexInputImage,
    CodexFunctionTool,
    CodexFunctionCall,
    CodexFunctionCallOutput,
} from '../types/codex';
import type { ClaudeRequest, ClaudeResponse, ClaudeStreamEvent, ClaudeContentBlock, ClaudeTool, ClaudeMessage } from '../types/claude';
import type { OpenAIRequest, OpenAIResponse, OpenAIStreamResponse, OpenAIContentPart } from '../types/openai';
import type {
    CodexRequestAst,
    CodexResponseAst,
    OpenAiRequestAst,
    OpenAIResponseAst,
    ClaudeRequestAst,
    ClaudeResponseAst,
    OpenAIStreamResponseAst,
    ClaudeStreamEventAst,
    CodexStreamEventAst,
} from './nodes';

@Injectable()
export class ToAnthropicVisitor extends BaseVisitor {
    visitCodexRequestAst(ast: CodexRequestAst, ctx: any): ClaudeRequest {
        return this.convertCodexToClaude(ast.request);
    }

    visitCodexResponseAst(ast: CodexResponseAst, ctx: any): ClaudeResponse {
        return this.convertCodexResponseToClaude(ast.response);
    }

    visitOpenAiRequestAst(ast: OpenAiRequestAst, ctx: any): ClaudeRequest {
        return this.convertOpenAIRequestToClaude(ast.request);
    }

    visitOpenAIResponseAst(ast: OpenAIResponseAst, ctx: any): ClaudeResponse {
        return this.convertOpenAIResponseToClaude(ast.response);
    }

    private convertOpenAIRequestToClaude(req: OpenAIRequest): ClaudeRequest {
        const messages: ClaudeMessage[] = [];
        let system: string | undefined;

        for (const msg of req.messages) {
            if (msg.role === 'system') {
                system = typeof msg.content === 'string' ? msg.content : msg.content?.map((p) => (p as OpenAIContentPart).text).join('\n');
                continue;
            }

            if (msg.role === 'tool') {
                const last = messages[messages.length - 1];
                const toolResult: ClaudeContentBlock = {
                    type: 'tool_result',
                    tool_use_id: msg.tool_call_id!,
                    content: typeof msg.content === 'string' ? msg.content : '',
                };
                if (last?.role === 'user' && Array.isArray(last.content)) {
                    (last.content as ClaudeContentBlock[]).push(toolResult);
                } else {
                    messages.push({ role: 'user', content: [toolResult] });
                }
                continue;
            }

            const role = msg.role === 'assistant' ? 'assistant' : 'user';
            const content = typeof msg.content === 'string'
                ? msg.content
                : msg.content?.map((p: any) => {
                    if (p.type === 'text') return { type: 'text' as const, text: p.text };
                    if (p.type === 'image_url') return { type: 'image' as const, source: { type: 'url' as const, url: p.image_url.url } };
                    return { type: 'text' as const, text: '' };
                }) || '';

            if (msg.tool_calls?.length) {
                const blocks: ClaudeContentBlock[] = typeof content === 'string' && content ? [{ type: 'text', text: content }] : (content as ClaudeContentBlock[]) || [];
                for (const tc of msg.tool_calls) {
                    blocks.push({
                        type: 'tool_use',
                        id: tc.id,
                        name: tc.function.name,
                        input: JSON.parse(tc.function.arguments || '{}'),
                    });
                }
                messages.push({ role, content: blocks });
            } else {
                messages.push({ role, content });
            }
        }

        return {
            model: req.model,
            messages,
            max_tokens: req.max_tokens ?? 4096,
            ...(system && { system }),
            ...(req.temperature !== undefined && { temperature: req.temperature }),
            ...(req.top_p !== undefined && { top_p: req.top_p }),
            ...(req.stream !== undefined && { stream: req.stream }),
            ...(req.stop && { stop_sequences: Array.isArray(req.stop) ? req.stop : [req.stop] }),
            ...(req.tools && { tools: req.tools.map(t => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters as any })) }),
        };
    }

    private convertOpenAIResponseToClaude(response: OpenAIResponse): ClaudeResponse {
        const content: ClaudeContentBlock[] = [];

        if (response.choices.length === 0) {
            return {
                id: response.id,
                type: 'message',
                role: 'assistant',
                model: response.model,
                content: [],
                stop_reason: 'end_turn',
                usage: {
                    input_tokens: response.usage.prompt_tokens,
                    output_tokens: response.usage.completion_tokens,
                    cache_creation_input_tokens: 0,
                    cache_read_input_tokens: 0,
                },
            };
        }

        const choice = response.choices[0]!;
        const message = choice.message;

        if (message.content) {
            const textContent = typeof message.content === 'string'
                ? message.content
                : message.content
                    .filter(part => part.type === 'text')
                    .map(part => part.text || '')
                    .join('\n');

            if (textContent) {
                content.push({
                    type: 'text',
                    text: textContent,
                });
            }
        }

        if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                content.push({
                    type: 'tool_use',
                    id: toolCall.id,
                    name: toolCall.function.name,
                    input: JSON.parse(toolCall.function.arguments),
                });
            }
        }

        return {
            id: response.id,
            type: 'message',
            role: 'assistant',
            model: response.model,
            content,
            stop_reason: this.mapOpenAIFinishReasonToClaudeStopReason(choice.finish_reason),
            usage: {
                input_tokens: response.usage.prompt_tokens,
                output_tokens: response.usage.completion_tokens,
                cache_creation_input_tokens: 0,
                cache_read_input_tokens: 0,
            },
        };
    }

    private mapOpenAIFinishReasonToClaudeStopReason(
        finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null
    ): ClaudeResponse['stop_reason'] {
        switch (finishReason) {
            case 'stop':
                return 'end_turn';
            case 'length':
                return 'max_tokens';
            case 'tool_calls':
                return 'tool_use';
            case 'content_filter':
                return 'end_turn';
            case null:
                return null;
            default:
                return 'end_turn';
        }
    }

    visitClaudeStreamEventAst(ast: ClaudeStreamEventAst, ctx: any): ClaudeStreamEvent {
        return ast.streamEvent;
    }

    visitCodexStreamEventAst(ast: CodexStreamEventAst, ctx: any): ClaudeStreamEvent | null {
        return this.convertCodexStreamToClaude(ast.streamEvent, ctx);
    }

    visitOpenAIStreamResponseAst(ast: OpenAIStreamResponseAst, ctx: any): ClaudeStreamEvent[] {
        return this.convertOpenAIStreamToClaude(ast.streamEvent, ctx);
    }

    visitClaudeRequestAst(ast: ClaudeRequestAst, ctx: any): ClaudeRequest {
        return ast.request;
    }

    visitClaudeResponseAst(ast: ClaudeResponseAst, ctx: any): ClaudeResponse {
        return ast.response;
    }

    private convertCodexToClaude(request: CodexRequest): ClaudeRequest {
        const messages: ClaudeMessage[] = [];

        for (const item of request.input) {
            if (item.type === 'message') {
                const messageInput = item as CodexMessageInput;
                const content = this.convertCodexContentToClaude(messageInput.content);

                messages.push({
                    role: messageInput.role === 'user' ? 'user' : 'assistant',
                    content,
                });
            } else if (item.type === 'function_call') {
                const functionCall = item as CodexFunctionCall;
                const lastMessage = messages[messages.length - 1];

                if (lastMessage && lastMessage.role === 'assistant') {
                    const blocks = typeof lastMessage.content === 'string'
                        ? [{ type: 'text' as const, text: lastMessage.content }]
                        : lastMessage.content;

                    blocks.push({
                        type: 'tool_use',
                        id: functionCall.call_id,
                        name: functionCall.name,
                        input: JSON.parse(functionCall.arguments),
                    });

                    lastMessage.content = blocks;
                }
            } else if (item.type === 'function_call_output') {
                const output = item as CodexFunctionCallOutput;
                const lastMessage = messages[messages.length - 1];

                if (lastMessage && lastMessage.role === 'user') {
                    const blocks = typeof lastMessage.content === 'string'
                        ? [{ type: 'text' as const, text: lastMessage.content }]
                        : lastMessage.content;

                    blocks.push({
                        type: 'tool_result',
                        tool_use_id: output.call_id,
                        content: output.output,
                    });

                    lastMessage.content = blocks;
                } else {
                    messages.push({
                        role: 'user',
                        content: [{
                            type: 'tool_result',
                            tool_use_id: output.call_id,
                            content: output.output,
                        }],
                    });
                }
            }
        }

        return {
            model: request.model,
            messages,
            max_tokens: 4096,
            system: request.instructions,
            stream: request.stream,
            tools: request.tools.length > 0 ? this.convertCodexToolsToClaude(request.tools as CodexFunctionTool[]) : undefined,
        };
    }

    private convertCodexContentToClaude(content: CodexContent[]): string | ClaudeContentBlock[] {
        if (content.length === 1 && content[0]!.type === 'input_text') {
            const textContent = content[0] as CodexInputText;
            return textContent.text;
        }

        return content.map(item => {
            if (item.type === 'input_text' || item.type === 'output_text') {
                const textContent = item as CodexInputText | CodexOutputText;
                return {
                    type: 'text' as const,
                    text: textContent.text,
                };
            }
            if (item.type === 'input_image') {
                const imageContent = item as CodexInputImage;
                const url = imageContent.image_url;
                if (url.startsWith('data:')) {
                    const [meta = '', data] = url.split(',');
                    const mediaType = meta.match(/data:([^;]+)/)?.[1] ?? 'image/png';
                    return {
                        type: 'image' as const,
                        source: {
                            type: 'base64' as const,
                            media_type: mediaType,
                            data,
                        },
                    };
                }
                return {
                    type: 'image' as const,
                    source: {
                        type: 'url' as const,
                        url,
                    },
                };
            }
            return { type: 'text' as const, text: '' };
        });
    }

    private convertCodexToolsToClaude(tools: CodexFunctionTool[]): ClaudeTool[] | undefined {
        if (!tools || tools.length === 0) {
            return undefined;
        }

        return tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: {
                type: tool.parameters.type,
                properties: tool.parameters.properties || {},
                required: tool.parameters.required,
                additionalProperties: tool.parameters.additionalProperties,
            } as Record<string, unknown>,
        }));
    }

    private convertCodexResponseToClaude(response: CodexResponse): ClaudeResponse {
        const content: ClaudeContentBlock[] = [];

        for (const item of response.output) {
            if (item.type === 'message') {
                const msg = item as CodexMessageInput;
                for (const c of msg.content) {
                    if (c.type === 'output_text') {
                        const textContent = c as CodexOutputText;
                        content.push({
                            type: 'text',
                            text: textContent.text,
                        });
                    }
                }
            } else if (item.type === 'function_call') {
                const fc = item as CodexFunctionCall;
                content.push({
                    type: 'tool_use',
                    id: fc.call_id,
                    name: fc.name,
                    input: JSON.parse(fc.arguments),
                });
            }
        }

        return {
            id: response.id,
            type: 'message',
            role: 'assistant',
            model: '',
            content,
            stop_reason: this.mapCodexStatusToClaudeStopReason(response.status),
            usage: {
                input_tokens: response.usage?.input_tokens || 0,
                output_tokens: response.usage?.output_tokens || 0,
                cache_creation_input_tokens: 0,
                cache_read_input_tokens: response.usage?.cached_input_tokens || 0,
            },
        };
    }

    private mapCodexStatusToClaudeStopReason(status: CodexResponse['status']): ClaudeResponse['stop_reason'] {
        switch (status) {
            case 'completed':
                return 'end_turn';
            case 'failed':
                return 'end_turn';
            case 'in_progress':
                return null;
            default:
                return 'end_turn';
        }
    }

    private convertOpenAIStreamToClaude(
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

    private convertCodexStreamToClaude(
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
}
