import { Injectable } from '@sker/core';
import { BaseVisitor } from './visitor';
import { OpenAIToCodexConverter } from '../openai-to-codex.converter';
import { CODEX_PROMPT } from '../tokens';
import type {
    CodexRequest,
    CodexResponse,
    CodexResponseEvent,
    CodexInputItem,
    CodexMessageInput,
    CodexContent,
    CodexFunctionTool,
    CodexTokenUsage,
} from '../types/codex';
import type { ClaudeContentBlock, ClaudeTool, ClaudeTextContent, ClaudeImageContent, ClaudeToolUseContent, ClaudeToolResultContent } from '../types/claude';
import type { ClaudeRequest, ClaudeResponse, ClaudeStreamEvent } from '../types/claude';
import type { OpenAIResponse, OpenAIStreamResponse } from '../types/openai';
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
export class ToCodexVisitor extends BaseVisitor {
    private openaiConverter = new OpenAIToCodexConverter();

    visitCodexRequestAst(ast: CodexRequestAst, _ctx: any): CodexRequest {
        return ast.request;
    }

    visitCodexResponseAst(ast: CodexResponseAst, _ctx: any): CodexResponse {
        return ast.response;
    }

    visitClaudeRequestAst(ast: ClaudeRequestAst, _ctx: any): CodexRequest {
        return this.convertClaudeToCodex(ast.request);
    }

    visitClaudeResponseAst(ast: ClaudeResponseAst, _ctx: any): CodexResponse {
        return this.convertClaudeResponseToCodex(ast.response);
    }

    visitOpenAIResponseAst(ast: OpenAIResponseAst, _ctx: any): CodexResponse {
        return this.convertOpenAIResponseToCodex(ast.response);
    }

    visitOpenAiRequestAst(ast: OpenAiRequestAst, _ctx: any): CodexRequest {
        return this.openaiConverter.convert(ast.request);
    }

    visitOpenAIStreamResponseAst(ast: OpenAIStreamResponseAst, ctx: any): CodexResponseEvent | null {
        return this.convertOpenAIStreamToCodex(ast.streamEvent, ctx);
    }

    visitClaudeStreamEventAst(ast: ClaudeStreamEventAst, ctx: any): CodexResponseEvent | null {
        return this.convertClaudeStreamToCodex(ast.streamEvent, ctx);
    }

    visitCodexStreamEventAst(ast: CodexStreamEventAst, _ctx: any): CodexResponseEvent {
        return ast.streamEvent;
    }

    private extractInstructions(system?: string | ClaudeContentBlock[]): string {
        if (!system) {
            return 'You are a helpful assistant.';
        }

        if (typeof system === 'string') {
            return system;
        }

        return system
            .filter((block): block is ClaudeTextContent => block.type === 'text')
            .map(block => block.text)
            .join('\n\n');
    }
    private convertClaudeToCodex(request: ClaudeRequest): CodexRequest {
        const inputItems = this.convertMessages(request.messages);

        if (request.system) {
            const systemText = this.extractInstructions(request.system);
            inputItems.unshift({
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text: systemText }]
            });
        }

        return {
            model: request.model,
            instructions: CODEX_PROMPT,
            input: inputItems,
            tools: this.convertClaudeTools(request.tools || []),
            tool_choice: this.convertClaudeToolChoice(request.tool_choice),
            parallel_tool_calls: true,
            stream: request.stream ?? false,
            include: [],
        };
    }

    private convertMessages(messages: ClaudeRequest['messages']): CodexInputItem[] {
        const inputItems: CodexInputItem[] = [];

        for (const message of messages) {
            const messageInput = this.convertClaudeMessage(message);
            inputItems.push(messageInput);

            if (Array.isArray(message.content)) {
                const toolUseBlocks = message.content.filter(
                    (block): block is ClaudeToolUseContent => block.type === 'tool_use'
                );

                for (const toolUse of toolUseBlocks) {
                    inputItems.push({
                        type: 'function_call',
                        name: toolUse.name,
                        arguments: JSON.stringify(toolUse.input),
                        call_id: toolUse.id,
                    });
                }

                const toolResultBlocks = message.content.filter(
                    (block): block is ClaudeToolResultContent => block.type === 'tool_result'
                );

                for (const toolResult of toolResultBlocks) {
                    inputItems.push({
                        type: 'function_call_output',
                        call_id: toolResult.tool_use_id,
                        output: typeof toolResult.content === 'string'
                            ? toolResult.content
                            : JSON.stringify(toolResult.content),
                    });
                }
            }
        }

        return inputItems;
    }

    private convertClaudeMessage(message: ClaudeRequest['messages'][0]): CodexMessageInput {
        return {
            type: 'message',
            role: message.role === 'user' ? 'user' : 'assistant',
            content: this.convertClaudeContent(message.content),
        };
    }

    private convertClaudeContent(content: string | ClaudeContentBlock[]): CodexContent[] {
        if (typeof content === 'string') {
            return [{ type: 'input_text', text: content }];
        }

        return content
            .filter((block): block is ClaudeTextContent | ClaudeImageContent =>
                block.type === 'text' || block.type === 'image')
            .map(block => {
                if (block.type === 'text') {
                    return {
                        type: 'input_text' as const,
                        text: block.text
                    };
                }

                const url = block.source.type === 'url'
                    ? block.source.url || ''
                    : `data:${block.source.media_type || 'image/png'};base64,${block.source.data || ''}`;

                return {
                    type: 'input_image' as const,
                    image_url: url
                };
            });
    }

    private convertClaudeTools(tools: ClaudeTool[]): CodexFunctionTool[] {
        return tools.map(tool => ({
            type: 'function',
            name: tool.name,
            description: tool.description || '',
            strict: false,
            parameters: {
                type: 'object',
                properties: this.extractProperties(tool.input_schema),
                required: (tool.input_schema.required as string[]) || undefined,
                additionalProperties: tool.input_schema.additionalProperties as boolean | undefined,
            },
        }));
    }

    private extractProperties(schema: Record<string, any>): Record<string, any> {
        if (!schema.properties) {
            return {};
        }
        return schema.properties;
    }

    private convertClaudeToolChoice(
        toolChoice?: ClaudeRequest['tool_choice']
    ): 'auto' | 'none' | string {
        if (!toolChoice) {
            return 'auto';
        }

        if (toolChoice.type === 'auto') {
            return 'auto';
        }

        if (toolChoice.type === 'any') {
            return 'auto';
        }

        if (toolChoice.type === 'tool' && toolChoice.name) {
            return toolChoice.name;
        }

        return 'auto';
    }

    private convertClaudeResponseToCodex(response: ClaudeResponse): CodexResponse {
        if ((response as any).code && (response as any).success === false) {
            const errorMsg = (response as any).msg || 'Unknown error';
            throw new Error(`Provider 返回错误: ${errorMsg}`);
        }

        if (!response.content || !Array.isArray(response.content)) {
            console.error('[convertClaudeResponseToCodex] response.content 不是数组，完整响应:', JSON.stringify(response));
            throw new Error(`Invalid Claude response format: content is not an array`);
        }

        const output: CodexInputItem[] = [];

        const assistantMessage: CodexMessageInput = {
            type: 'message',
            role: 'assistant',
            content: [],
        };

        for (const block of response.content) {
            if (block.type === 'text') {
                if (block.text && block.text.trim()) {
                    assistantMessage.content.push({
                        type: 'output_text',
                        text: block.text,
                    });
                }
            } else if (block.type === 'tool_use') {
                output.push({
                    type: 'function_call',
                    name: block.name,
                    arguments: JSON.stringify(block.input),
                    call_id: block.id,
                });
            }
        }

        if (assistantMessage.content.length > 0) {
            output.unshift(assistantMessage);
        }

        return {
            id: response.id,
            object: 'response',
            created_at: Date.now(),
            status: this.mapClaudeStopReasonToStatus(response.stop_reason),
            output,
            usage: this.convertClaudeUsageToCodex(response.usage),
        };
    }

    private convertOpenAIResponseToCodex(response: OpenAIResponse): CodexResponse {
        const output: CodexInputItem[] = [];

        if (response.choices.length === 0) {
            return {
                id: response.id,
                object: 'response',
                created_at: response.created * 1000,
                status: 'completed',
                output: [],
                usage: this.convertOpenAIUsageToCodex(response.usage),
            };
        }

        const choice = response.choices[0]!;
        const message = choice.message;

        const assistantMessage: CodexMessageInput = {
            type: 'message',
            role: 'assistant',
            content: [],
        };

        if (message.content) {
            const textContent = typeof message.content === 'string'
                ? message.content
                : message.content
                    .filter(part => part.type === 'text')
                    .map(part => part.text || '')
                    .join('\n');

            if (textContent && textContent.trim()) {
                assistantMessage.content.push({
                    type: 'output_text',
                    text: textContent,
                });
            }
        }

        if (assistantMessage.content.length > 0) {
            output.push(assistantMessage);
        }

        if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                output.push({
                    type: 'function_call',
                    name: toolCall.function.name,
                    arguments: toolCall.function.arguments,
                    call_id: toolCall.id,
                });
            }
        }

        return {
            id: response.id,
            object: 'response',
            created_at: response.created * 1000,
            status: this.mapOpenAIFinishReasonToStatus(choice.finish_reason),
            output,
            usage: this.convertOpenAIUsageToCodex(response.usage),
        };
    }

    private mapClaudeStopReasonToStatus(
        stopReason: ClaudeResponse['stop_reason']
    ): CodexResponse['status'] {
        switch (stopReason) {
            case 'end_turn':
                return 'completed';
            case 'max_tokens':
                return 'completed';
            case 'stop_sequence':
                return 'completed';
            case 'tool_use':
                return 'completed';
            case null:
                return 'in_progress';
            default:
                return 'completed';
        }
    }

    private mapOpenAIFinishReasonToStatus(
        finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null
    ): CodexResponse['status'] {
        switch (finishReason) {
            case 'stop':
                return 'completed';
            case 'length':
                return 'completed';
            case 'tool_calls':
                return 'completed';
            case 'content_filter':
                return 'failed';
            case null:
                return 'in_progress';
            default:
                return 'completed';
        }
    }

    private convertClaudeUsageToCodex(usage: ClaudeResponse['usage']): CodexTokenUsage {
        return {
            input_tokens: usage.input_tokens,
            cached_input_tokens: usage.cache_read_input_tokens || 0,
            output_tokens: usage.output_tokens,
            reasoning_output_tokens: 0,
            total_tokens: usage.input_tokens + usage.output_tokens,
        };
    }

    private convertOpenAIUsageToCodex(usage: OpenAIResponse['usage']): CodexTokenUsage {
        return {
            input_tokens: usage.prompt_tokens,
            cached_input_tokens: 0,
            output_tokens: usage.completion_tokens,
            reasoning_output_tokens: 0,
            total_tokens: usage.total_tokens,
        };
    }

    private convertOpenAIStreamToCodex(
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

    private convertClaudeStreamToCodex(
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
}
