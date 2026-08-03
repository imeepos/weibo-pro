import type { OpenAIResponse } from '../types/openai';
import type {
    CodexInputItem,
    CodexMessageInput,
    CodexResponse,
    CodexTokenUsage,
} from '../types/codex';

/**
 * 将 OpenAI 响应转换为 Codex 响应
 */
export function convertOpenAIResponseToCodex(response: OpenAIResponse): CodexResponse {
    const output: CodexInputItem[] = [];

    if (response.choices.length === 0) {
        return {
            id: response.id,
            object: 'response',
            created_at: response.created * 1000,
            status: 'completed',
            output: [],
            usage: convertOpenAIUsageToCodex(response.usage),
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
        status: mapOpenAIFinishReasonToStatus(choice.finish_reason),
        output,
        usage: convertOpenAIUsageToCodex(response.usage),
    };
}

function mapOpenAIFinishReasonToStatus(
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

function convertOpenAIUsageToCodex(usage: OpenAIResponse['usage']): CodexTokenUsage {
    return {
        input_tokens: usage.prompt_tokens,
        cached_input_tokens: 0,
        output_tokens: usage.completion_tokens,
        reasoning_output_tokens: 0,
        total_tokens: usage.total_tokens,
    };
}
