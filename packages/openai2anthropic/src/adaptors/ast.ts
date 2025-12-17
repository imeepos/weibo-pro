import { claudeRequestToOpenai, openaiRequestToClaude, createClaudeToOpenaiStreamConverter, createOpenaiToClaudeStreamConverter } from "../converters";
import { ClaudeRequest, ClaudeResponse, OpenAIRequest, OpenAIResponse, OpenAIStreamResponse, ClaudeStreamEvent } from "../types";
import { OpenAIToCodexConverter } from "./openai-to-codex.converter";
import type {
    CodexRequest,
    CodexResponse,
    CodexResponseEvent,
    CodexInputItem,
    CodexMessageInput,
    CodexContent,
    CodexInputText,
    CodexInputImage,
    CodexOutputText,
    CodexFunctionTool,
    CodexFunctionCall,
    CodexFunctionCallOutput,
    CodexTokenUsage,
} from "./types/codex";
import type { ClaudeContentBlock, ClaudeTool, ClaudeMessage, ClaudeTextContent, ClaudeImageContent, ClaudeToolUseContent, ClaudeToolResultContent } from "./types/claude";
import type { OpenAIMessage, OpenAIContentPart } from "./types/openai";
import { Injectable } from '@sker/core'
import { CODEX_PROMPT } from "./tokens";
export abstract class Ast {
    abstract visit(visitor: Visitor, ctx: any): any;
}

export class CodexRequestAst extends Ast {
    provider: `codex` = `codex`
    type: `request` = `request`
    request!: CodexRequest;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitCodexRequestAst(this, ctx)
    }
}

export class CodexResponseAst extends Ast {
    provider: `codex` = `codex`
    type: `response` = `response`
    response!: CodexResponse;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitCodexResponseAst(this, ctx)
    }
}

export class OpenAIResponseAst extends Ast {
    provider: `codex` = `codex`
    type: `response` = `response`
    response!: OpenAIResponse;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitOpenAIResponseAst(this, ctx)
    }
}


export class OpenAiRequestAst extends Ast {
    provider: `openai` = `openai`
    type: `request` = `request`
    request!: OpenAIRequest;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitOpenAiRequestAst(this, ctx)
    }
}

export class ClaudeRequestAst extends Ast {
    provider: `claude` = `claude`
    type: `request` = `request`
    request!: ClaudeRequest;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitClaudeRequestAst(this, ctx)
    }
}

export class ClaudeResponseAst extends Ast {
    provider: `claude` = `claude`
    type: `response` = `response`
    response!: ClaudeResponse;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitClaudeResponseAst(this, ctx)
    }
}

export class OpenAIStreamResponseAst extends Ast {
    provider: `openai` = `openai`
    type: `stream` = `stream`
    streamEvent!: OpenAIStreamResponse;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitOpenAIStreamResponseAst(this, ctx)
    }
}

export class ClaudeStreamEventAst extends Ast {
    provider: `claude` = `claude`
    type: `stream` = `stream`
    streamEvent!: ClaudeStreamEvent;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitClaudeStreamEventAst(this, ctx)
    }
}

export class CodexStreamEventAst extends Ast {
    provider: `codex` = `codex`
    type: `stream` = `stream`
    streamEvent!: CodexResponseEvent;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitCodexStreamEventAst(this, ctx)
    }
}

export interface Visitor {
    visit(ast: Ast, ctx: any): any;
    visitCodexRequestAst(ast: CodexRequestAst, ctx: any): any;
    visitCodexResponseAst(ast: CodexResponseAst, ctx: any): any;
    visitOpenAiRequestAst(ast: OpenAiRequestAst, ctx: any): any;
    visitOpenAIResponseAst(ast: OpenAIResponseAst, ctx: any): any;
    visitClaudeRequestAst(ast: ClaudeRequestAst, ctx: any): any;
    visitClaudeResponseAst(ast: ClaudeResponseAst, ctx: any): any;
    visitOpenAIStreamResponseAst(ast: OpenAIStreamResponseAst, ctx: any): any;
    visitClaudeStreamEventAst(ast: ClaudeStreamEventAst, ctx: any): any;
    visitCodexStreamEventAst(ast: CodexStreamEventAst, ctx: any): any;
}

export class BaseVisitor implements Visitor {
    visit(ast: Ast, ctx: any) {
        return ast.visit(this, ctx)
    }
    visitCodexRequestAst(ast: CodexRequestAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitCodexResponseAst(ast: CodexResponseAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitOpenAiRequestAst(ast: OpenAiRequestAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitOpenAIResponseAst(ast: OpenAIResponseAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitClaudeRequestAst(ast: ClaudeRequestAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitClaudeResponseAst(ast: ClaudeResponseAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitOpenAIStreamResponseAst(ast: OpenAIStreamResponseAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitClaudeStreamEventAst(ast: ClaudeStreamEventAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitCodexStreamEventAst(ast: CodexStreamEventAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
}

@Injectable()
export class ToCodexVisitor extends BaseVisitor {
    private openaiConverter = new OpenAIToCodexConverter();

    visitCodexRequestAst(ast: CodexRequestAst, ctx: any): CodexRequest {
        return ast.request;
    }

    visitCodexResponseAst(ast: CodexResponseAst, ctx: any): CodexResponse {
        return ast.response;
    }

    visitClaudeRequestAst(ast: ClaudeRequestAst, ctx: any): CodexRequest {
        return this.convertClaudeToCodex(ast.request);
    }

    visitClaudeResponseAst(ast: ClaudeResponseAst, ctx: any): CodexResponse {
        return this.convertClaudeResponseToCodex(ast.response);
    }

    visitOpenAIResponseAst(ast: OpenAIResponseAst, ctx: any): CodexResponse {
        return this.convertOpenAIResponseToCodex(ast.response);
    }

    visitOpenAiRequestAst(ast: OpenAiRequestAst, ctx: any): CodexRequest {
        return this.openaiConverter.convert(ast.request);
    }

    visitOpenAIStreamResponseAst(ast: OpenAIStreamResponseAst, ctx: any): CodexResponseEvent | null {
        return this.convertOpenAIStreamToCodex(ast.streamEvent, ctx);
    }

    visitClaudeStreamEventAst(ast: ClaudeStreamEventAst, ctx: any): CodexResponseEvent | null {
        return this.convertClaudeStreamToCodex(ast.streamEvent, ctx);
    }

    visitCodexStreamEventAst(ast: CodexStreamEventAst, ctx: any): CodexResponseEvent {
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

        // 将 system prompt 作为第一条用户消息插入到 input 开头
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
            instructions: CODEX_PROMPT,  // 固定的 Codex CLI 指令
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

                // block is ClaudeImageContent
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
        // 检测非标准错误响应（某些 API 返回 200 但内容是错误）
        if ((response as any).code && (response as any).success === false) {
            const errorMsg = (response as any).msg || 'Unknown error';
            throw new Error(`Provider 返回错误: ${errorMsg}`);
        }

        // 防御性检查：确保 content 存在且可迭代
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
                // 过滤空文本
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

            // 过滤空文本
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

    /**
     * OpenAI 流式事件转 Codex 流式事件
     * OpenAI: { choices: [{ delta: { content, role, tool_calls }, finish_reason }] }
     * Codex: { type: 'response.output_text.delta', delta }
     */
    private convertOpenAIStreamToCodex(
        stream: OpenAIStreamResponse,
        ctx: any
    ): CodexResponseEvent | null {
        // 初始化流式状态
        if (!ctx.streamState) {
            ctx.streamState = {
                assistantItemId: `item_${Date.now()}`,
                createdSent: false,
                toolCalls: new Map<number, { id: string; name: string; arguments: string }>(),
            };
        }

        const state = ctx.streamState;

        // 首次事件：发送 response.created
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

        // 文本内容增量
        if (delta.content) {
            return {
                type: 'response.output_text.delta',
                delta: delta.content,
            };
        }

        // 工具调用增量（OpenAI 流式工具调用较复杂）
        if (delta.tool_calls) {
            for (const toolCall of delta.tool_calls) {
                const index = toolCall.index ?? 0;

                if (!state.toolCalls.has(index)) {
                    // 新工具调用
                    state.toolCalls.set(index, {
                        id: toolCall.id || `call_${Date.now()}_${index}`,
                        name: toolCall.function?.name || '',
                        arguments: toolCall.function?.arguments || '',
                    });

                    // 发送 output_item.added 事件
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
                    // 累积参数
                    const existing = state.toolCalls.get(index)!;
                    if (toolCall.function?.arguments) {
                        existing.arguments += toolCall.function.arguments;
                    }
                }
            }
        }

        // 完成事件
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
     * Claude 流式事件转 Codex 流式事件
     * Claude: message_start, content_block_delta, message_delta, message_stop
     * Codex: response.created, response.output_text.delta, response.completed
     */
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
                    // Claude 工具调用的参数增量（暂不处理）
                    return null;
                }
                return null;

            case 'content_block_stop':
                // 内容块结束（可选处理）
                return null;

            case 'message_delta':
                // 消息增量（可能包含 stop_reason）
                return null;

            case 'message_stop':
                // 使用上下文中的消息 ID
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

            case 'ping':
                // 心跳事件（忽略）
                return null;

            default:
                return null;
        }
    }
}

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
        const openaiRequest = claudeRequestToOpenai(ast.request);
        return openaiRequest;
    }

    visitClaudeResponseAst(ast: ClaudeResponseAst, ctx: any): OpenAIResponse {
        return this.convertClaudeResponseToOpenAI(ast.response);
    }

    private convertClaudeResponseToOpenAI(response: ClaudeResponse): OpenAIResponse {
        // 检测非标准错误响应（某些 API 返回 200 但内容是错误）
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

        // 防御性检查：确保 content 存在且可迭代
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

    /**
     * Claude 流式事件转 OpenAI 流式响应
     */
    private convertClaudeStreamToOpenAI(
        event: ClaudeStreamEvent,
        ctx: any
    ): OpenAIStreamResponse | null {
        // 初始化流式状态
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
     * Codex 流式事件转 OpenAI 流式响应
     * Codex: { type: 'response.output_text.delta', delta }
     * OpenAI: { choices: [{ delta: { content }, finish_reason }] }
     */
    private convertCodexStreamToOpenAI(
        event: CodexResponseEvent,
        ctx: any
    ): OpenAIStreamResponse | null {
        // 初始化基础结构
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
                // OpenAI 流式开始时发送 role
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
                // 工具调用开始
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
                // 项完成（可选）
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
                // 失败事件映射为 content_filter
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
                // OpenAI 不支持推理增量，忽略或转为普通文本
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
                // OpenAI 不支持这些事件，忽略
                return null;

            default:
                return null;
        }
    }
}

@Injectable()
export class ToAnthropicVisitor extends BaseVisitor {
    visitCodexRequestAst(ast: CodexRequestAst, ctx: any): ClaudeRequest {
        return this.convertCodexToClaude(ast.request);
    }

    visitCodexResponseAst(ast: CodexResponseAst, ctx: any): ClaudeResponse {
        return this.convertCodexResponseToClaude(ast.response);
    }

    visitOpenAiRequestAst(ast: OpenAiRequestAst, ctx: any): ClaudeRequest {
        const claudeRequest = openaiRequestToClaude(ast.request);
        return claudeRequest;
    }

    visitOpenAIResponseAst(ast: OpenAIResponseAst, ctx: any): ClaudeResponse {
        return this.convertOpenAIResponseToClaude(ast.response);
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

    /**
     * OpenAI 流式事件转 Claude 流式事件
     */
    private convertOpenAIStreamToClaude(
        chunk: OpenAIStreamResponse,
        ctx: any
    ): ClaudeStreamEvent[] {
        const events: ClaudeStreamEvent[] = [];

        // 初始化流式状态
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

    /**
     * Codex 流式事件转 Claude 流式事件
     * Codex: { type: 'response.output_text.delta', delta }
     * Claude: { type: 'content_block_delta', delta: { type: 'text_delta', text } }
     */
    private convertCodexStreamToClaude(
        event: CodexResponseEvent,
        ctx: any
    ): ClaudeStreamEvent | null {
        // 初始化上下文
        if (!ctx.messageId) {
            ctx.messageId = `msg_${Date.now()}`;
            ctx.model = 'claude-3-5-sonnet-20241022';
            ctx.contentBlockIndex = 0;
        }

        switch (event.type) {
            case 'response.created':
                // Claude 的 message_start 事件
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
                // 新内容块开始
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
                // 内容块完成
                return {
                    type: 'content_block_stop',
                    index: ctx.contentBlockIndex - 1 || 0,
                };

            case 'response.reasoning_summary_text.delta':
            case 'response.reasoning_text.delta':
                // Claude 目前不支持推理，转为普通文本增量
                return {
                    type: 'content_block_delta',
                    index: ctx.contentBlockIndex - 1 || 0,
                    delta: {
                        type: 'text_delta',
                        text: event.delta,
                    },
                };

            case 'response.completed':
                // Claude 的 message_stop 事件
                // 先发送 message_delta（包含 usage）
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
                // Claude 标准流式事件不包含 error 类型
                // 返回 message_stop 以结束流
                return {
                    type: 'message_stop',
                };

            case 'response.reasoning_summary_part.added':
            case 'rate_limits':
                // Claude 不支持这些事件
                return null;

            default:
                return null;
        }
    }
}

