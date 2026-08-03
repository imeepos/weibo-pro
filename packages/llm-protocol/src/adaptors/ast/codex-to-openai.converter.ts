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
import type { OpenAIRequest, OpenAIResponse, OpenAIMessage, OpenAIContentPart } from '../types/openai';

/**
 * 将 Codex 请求转换为 OpenAI Chat Completions 请求
 */
export function convertCodexToOpenAI(request: CodexRequest): OpenAIRequest {
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
            const content = convertCodexContentToOpenAI(messageInput.content);

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
        tools: request.tools.length > 0 ? convertCodexToolsToOpenAI(request.tools as CodexFunctionTool[]) : undefined,
    };
}

/**
 * 将 Codex 内容数组转换为 OpenAI content 字符串或内容分片
 */
export function convertCodexContentToOpenAI(content: CodexContent[]): string | OpenAIContentPart[] {
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

/**
 * 将 Codex 工具定义转换为 OpenAI 工具定义
 */
export function convertCodexToolsToOpenAI(tools: CodexFunctionTool[]): any[] | undefined {
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

/**
 * 将 Codex 响应转换为 OpenAI Chat Completions 响应
 */
export function convertCodexResponseToOpenAI(response: CodexResponse): OpenAIResponse {
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
            finish_reason: mapCodexStatusToOpenAIFinishReason(response.status),
        }],
        usage: {
            prompt_tokens: response.usage?.input_tokens || 0,
            completion_tokens: response.usage?.output_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0,
        },
    };
}

/**
 * 将 Codex 状态映射为 OpenAI finish_reason
 */
export function mapCodexStatusToOpenAIFinishReason(status: CodexResponse['status']): 'stop' | 'length' | 'tool_calls' | 'content_filter' | null {
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
