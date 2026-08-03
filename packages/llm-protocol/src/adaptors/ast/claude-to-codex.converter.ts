import { CODEX_PROMPT } from '../tokens';
import type {
    ClaudeContentBlock,
    ClaudeImageContent,
    ClaudeRequest,
    ClaudeResponse,
    ClaudeTextContent,
    ClaudeTool,
    ClaudeToolResultContent,
    ClaudeToolUseContent,
} from '../types/claude';
import type {
    CodexContent,
    CodexFunctionTool,
    CodexInputItem,
    CodexMessageInput,
    CodexRequest,
    CodexResponse,
    CodexTokenUsage,
} from '../types/codex';

/**
 * 将 Claude 请求转换为 Codex 请求
 */
export function convertClaudeToCodex(request: ClaudeRequest): CodexRequest {
    const inputItems = convertMessages(request.messages);

    if (request.system) {
        const systemText = extractInstructions(request.system);
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
        tools: convertClaudeTools(request.tools || []),
        tool_choice: convertClaudeToolChoice(request.tool_choice),
        parallel_tool_calls: true,
        stream: request.stream ?? false,
        include: [],
    };
}

/**
 * 将 Claude 响应转换为 Codex 响应
 */
export function convertClaudeResponseToCodex(response: ClaudeResponse): CodexResponse {
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
        status: mapClaudeStopReasonToStatus(response.stop_reason),
        output,
        usage: convertClaudeUsageToCodex(response.usage),
    };
}

function extractInstructions(system?: string | ClaudeContentBlock[]): string {
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

function convertMessages(messages: ClaudeRequest['messages']): CodexInputItem[] {
    const inputItems: CodexInputItem[] = [];

    for (const message of messages) {
        const messageInput = convertClaudeMessage(message);
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

function convertClaudeMessage(message: ClaudeRequest['messages'][0]): CodexMessageInput {
    return {
        type: 'message',
        role: message.role === 'user' ? 'user' : 'assistant',
        content: convertClaudeContent(message.content),
    };
}

function convertClaudeContent(content: string | ClaudeContentBlock[]): CodexContent[] {
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

function convertClaudeTools(tools: ClaudeTool[]): CodexFunctionTool[] {
    return tools.map(tool => ({
        type: 'function',
        name: tool.name,
        description: tool.description || '',
        strict: false,
        parameters: {
            type: 'object',
            properties: extractProperties(tool.input_schema),
            required: (tool.input_schema.required as string[]) || undefined,
            additionalProperties: tool.input_schema.additionalProperties as boolean | undefined,
        },
    }));
}

function extractProperties(schema: Record<string, any>): Record<string, any> {
    if (!schema.properties) {
        return {};
    }
    return schema.properties;
}

function convertClaudeToolChoice(
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

function mapClaudeStopReasonToStatus(
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

function convertClaudeUsageToCodex(usage: ClaudeResponse['usage']): CodexTokenUsage {
    return {
        input_tokens: usage.input_tokens,
        cached_input_tokens: usage.cache_read_input_tokens || 0,
        output_tokens: usage.output_tokens,
        reasoning_output_tokens: 0,
        total_tokens: usage.input_tokens + usage.output_tokens,
    };
}
