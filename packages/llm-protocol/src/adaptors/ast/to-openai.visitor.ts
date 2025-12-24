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
import type { ClaudeRequest, ClaudeResponse, ClaudeStreamEvent, ClaudeContentBlock, ClaudeTool } from '../types/claude';
import type { OpenAIRequest, OpenAIResponse, OpenAIStreamResponse, OpenAIMessage, OpenAIContentPart } from '../types/openai';
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
export class ToOpenAiVisitor extends BaseVisitor {
    visitCodexRequestAst(ast: CodexRequestAst, ctx: any): OpenAIRequest {
        return this.convertCodexToOpenAI(ast.request);
    }

    visitCodexResponseAst(ast: CodexResponseAst, ctx: any): OpenAIResponse {
        return this.convertCodexResponseToOpenAI(ast.response);
    }

    visitOpenAiRequestAst(ast: OpenAiRequestAst, ctx: any): OpenAIRequest {
        return ast.request;
    }

    visitOpenAIResponseAst(ast: OpenAIResponseAst, ctx: any): OpenAIResponse {
        return ast.response;
    }

    visitClaudeRequestAst(ast: ClaudeRequestAst, ctx: any): OpenAIRequest {
        return this.convertClaudeRequestToOpenAI(ast.request);
    }

    visitClaudeResponseAst(ast: ClaudeResponseAst, ctx: any): OpenAIResponse {
        return this.convertClaudeResponseToOpenAI(ast.response);
    }

    private convertClaudeRequestToOpenAI(req: ClaudeRequest): OpenAIRequest {
        const messages: OpenAIMessage[] = [];

        if (req.system) {
            const systemText = typeof req.system === 'string' ? req.system : req.system.map((s: any) => s.text).join('\n');
            messages.push({ role: 'system', content: systemText });
        }

        for (const msg of req.messages) {
            if (typeof msg.content === 'string') {
                messages.push({ role: msg.role, content: msg.content });
                continue;
            }

            const toolResults = msg.content.filter((b: any) => b.type === 'tool_result');
            const toolUses = msg.content.filter((b: any) => b.type === 'tool_use');
            const others = msg.content.filter((b: any) => b.type !== 'tool_result' && b.type !== 'tool_use');

            for (const tr of toolResults) {
                if (tr.type === 'tool_result') {
                    messages.push({
                        role: 'tool',
                        tool_call_id: tr.tool_use_id,
                        content: typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content),
                    });
                }
            }

            if (toolUses.length) {
                const textContent = others.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
                messages.push({
                    role: 'assistant',
                    content: textContent || null,
                    tool_calls: toolUses.map((tu: any) => ({
                        id: tu.id,
                        type: 'function' as const,
                        function: { name: tu.name, arguments: JSON.stringify(tu.input) },
                    })),
                });
            } else if (others.length) {
                const content = others.map((b: any) => {
                    if (b.type === 'text') return { type: 'text' as const, text: b.text };
                    if (b.type === 'image') return { type: 'image_url' as const, image_url: { url: b.source.url || '' } };
                    return { type: 'text' as const, text: '' };
                });
                messages.push({ role: msg.role, content: content.length === 1 && content[0]?.type === 'text' ? content[0].text : content });
            }
        }

        return {
            model: req.model,
            messages,
            max_tokens: req.max_tokens,
            ...(req.temperature !== undefined && { temperature: req.temperature }),
            ...(req.top_p !== undefined && { top_p: req.top_p }),
            ...(req.stream !== undefined && { stream: req.stream }),
            ...(req.stop_sequences?.length && { stop: req.stop_sequences }),
            ...(req.tools && { tools: req.tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } })) }),
        };
    }

    private convertClaudeResponseToOpenAI(response: ClaudeResponse): OpenAIResponse {
        if ((response as any).code && (response as any).success === false) {
            const errorMsg = (response as any).msg || 'Unknown error';
            console.error('[convertClaudeResponseToOpenAI] BigModel 返回了非标准错误格式:', {
                code: (response as any).code,
                success: (response as any).success,
                msg: errorMsg,
                rawResponse: JSON.stringify(response).slice(0, 500)
            });
            throw new Error(`Provider 返回错误 [${(response as any).code}]: ${errorMsg}`);
        }

        if (!response.content || !Array.isArray(response.content)) {
            console.error('[convertClaudeResponseToOpenAI] 响应格式无效:', {
                hasContent: !!response.content,
                contentType: typeof response.content,
                isArray: Array.isArray(response.content),
                rawResponse: JSON.stringify(response).slice(0, 500)
            });
            throw new Error(`Invalid Claude response format: content is ${response.content ? typeof response.content : 'missing'}`);
        }

        const message: OpenAIMessage = {
            role: 'assistant',
            content: '',
        };

        for (const block of response.content) {
            if (block.type === 'text') {
                message.content += block.text;
            } else if (block.type === 'tool_use') {
                if (!message.tool_calls) {
                    message.tool_calls = [];
                }
                message.tool_calls.push({
                    id: block.id,
                    type: 'function',
                    function: {
                        name: block.name,
                        arguments: JSON.stringify(block.input),
                    },
                });
            }
        }

        return {
            id: response.id,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: response.model,
            choices: [{
                index: 0,
                message,
                finish_reason: this.mapClaudeStopReasonToOpenAI(response.stop_reason),
            }],
            usage: {
                prompt_tokens: response.usage?.input_tokens || 0,
                completion_tokens: response.usage?.output_tokens || 0,
                total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
            },
        };
    }

    private mapClaudeStopReasonToOpenAI(
        stopReason: ClaudeResponse['stop_reason']
    ): 'stop' | 'length' | 'tool_calls' | 'content_filter' | null {
        switch (stopReason) {
            case 'end_turn':
                return 'stop';
            case 'max_tokens':
                return 'length';
            case 'stop_sequence':
                return 'stop';
            case 'tool_use':
                return 'tool_calls';
            case null:
                return null;
            default:
                return 'stop';
        }
    }

    visitOpenAIStreamResponseAst(ast: OpenAIStreamResponseAst, ctx: any): OpenAIStreamResponse {
        return ast.streamEvent;
    }

    visitCodexStreamEventAst(ast: CodexStreamEventAst, ctx: any): OpenAIStreamResponse | null {
        return this.convertCodexStreamToOpenAI(ast.streamEvent, ctx);
    }

    visitClaudeStreamEventAst(ast: ClaudeStreamEventAst, ctx: any): OpenAIStreamResponse | null {
        return this.convertClaudeStreamToOpenAI(ast.streamEvent, ctx);
    }

    private convertCodexToOpenAI(request: CodexRequest): OpenAIRequest {
        const messages: OpenAIMessage[] = [];

        if (request.instructions && request.instructions !== 'You are a helpful assistant.') {
            messages.push({
                role: 'system',
                content: request.instructions,
            });
        }

        for (const item of request.input) {
            if (item.type === 'message') {
                const messageInput = item as CodexMessageInput;
                const content = this.convertCodexContentToOpenAI(messageInput.content);

                messages.push({
                    role: messageInput.role === 'user' ? 'user' : 'assistant',
                    content,
                });
            } else if (item.type === 'function_call') {
                const functionCall = item as CodexFunctionCall;
                const lastMessage = messages[messages.length - 1];

                if (lastMessage && lastMessage.role === 'assistant') {
                    if (!lastMessage.tool_calls) {
                        lastMessage.tool_calls = [];
                    }
                    lastMessage.tool_calls.push({
                        id: functionCall.call_id,
                        type: 'function',
                        function: {
                            name: functionCall.name,
                            arguments: functionCall.arguments,
                        },
                    });
                }
            } else if (item.type === 'function_call_output') {
                const output = item as CodexFunctionCallOutput;
                messages.push({
                    role: 'tool',
                    content: output.output,
                    tool_call_id: output.call_id,
                });
            }
        }

        return {
            model: request.model,
            messages,
            stream: request.stream,
            tools: request.tools.length > 0 ? this.convertCodexToolsToOpenAI(request.tools as CodexFunctionTool[]) : undefined,
        };
    }

    private convertCodexContentToOpenAI(content: CodexContent[]): string | OpenAIContentPart[] {
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
                return {
                    type: 'image_url' as const,
                    image_url: {
                        url: imageContent.image_url,
                    },
                };
            }
            return { type: 'text' as const, text: '' };
        });
    }

    private convertCodexToolsToOpenAI(tools: CodexFunctionTool[]): any[] | undefined {
        if (!tools || tools.length === 0) {
            return undefined;
        }

        return tools.map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
            },
        }));
    }

    private convertCodexResponseToOpenAI(response: CodexResponse): OpenAIResponse {
        const message: OpenAIMessage = {
            role: 'assistant',
            content: '',
        };

        for (const item of response.output) {
            if (item.type === 'message') {
                const msg = item as CodexMessageInput;
                const textContent = msg.content
                    .filter((c): c is CodexOutputText => c.type === 'output_text')
                    .map(c => c.text)
                    .join('\n');
                message.content = textContent;
            } else if (item.type === 'function_call') {
                const fc = item as CodexFunctionCall;
                if (!message.tool_calls) {
                    message.tool_calls = [];
                }
                message.tool_calls.push({
                    id: fc.call_id,
                    type: 'function',
                    function: {
                        name: fc.name,
                        arguments: fc.arguments,
                    },
                });
            }
        }

        return {
            id: response.id,
            object: 'chat.completion',
            created: Math.floor(response.created_at / 1000),
            model: '',
            choices: [{
                index: 0,
                message,
                finish_reason: this.mapCodexStatusToOpenAIFinishReason(response.status),
            }],
            usage: {
                prompt_tokens: response.usage?.input_tokens || 0,
                completion_tokens: response.usage?.output_tokens || 0,
                total_tokens: response.usage?.total_tokens || 0,
            },
        };
    }

    private mapCodexStatusToOpenAIFinishReason(status: CodexResponse['status']): 'stop' | 'length' | 'tool_calls' | 'content_filter' | null {
        switch (status) {
            case 'completed':
                return 'stop';
            case 'failed':
                return 'content_filter';
            case 'in_progress':
                return null;
            default:
                return 'stop';
        }
    }

    private convertClaudeStreamToOpenAI(
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

    private convertCodexStreamToOpenAI(
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
}
