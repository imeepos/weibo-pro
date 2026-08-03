import type {
    CodexRequest,
    CodexResponse,
    CodexMessageInput,
    CodexContent,
    CodexInputText,
    CodexOutputText,
    CodexInputImage,
    CodexFunctionTool,
    CodexFunctionCall,
    CodexFunctionCallOutput,
} from '../types/codex';
import type { ClaudeRequest, ClaudeResponse, ClaudeContentBlock, ClaudeTool, ClaudeMessage } from '../types/claude';

export function convertCodexToClaude(request: CodexRequest): ClaudeRequest {
    const messages: ClaudeMessage[] = [];

    for (const item of request.input) {
        if (item.type === 'message') {
            const messageInput = item as CodexMessageInput;
            const content = convertCodexContentToClaude(messageInput.content);

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
        tools: request.tools.length > 0 ? convertCodexToolsToClaude(request.tools as CodexFunctionTool[]) : undefined,
    };
}

export function convertCodexContentToClaude(content: CodexContent[]): string | ClaudeContentBlock[] {
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

export function convertCodexToolsToClaude(tools: CodexFunctionTool[]): ClaudeTool[] | undefined {
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

export function convertCodexResponseToClaude(response: CodexResponse): ClaudeResponse {
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
        stop_reason: mapCodexStatusToClaudeStopReason(response.status),
        usage: {
            input_tokens: response.usage?.input_tokens || 0,
            output_tokens: response.usage?.output_tokens || 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: response.usage?.cached_input_tokens || 0,
        },
    };
}

export function mapCodexStatusToClaudeStopReason(status: CodexResponse['status']): ClaudeResponse['stop_reason'] {
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
