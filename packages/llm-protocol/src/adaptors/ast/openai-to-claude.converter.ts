import type { ClaudeRequest, ClaudeResponse, ClaudeContentBlock, ClaudeMessage } from '../types/claude';
import type { OpenAIRequest, OpenAIResponse, OpenAIContentPart } from '../types/openai';
import { isUnknownRequest, UnknownRequest } from '../types/unknown';

export function convertUnknownRequestToClaude(req: UnknownRequest): ClaudeRequest {
    return {
        model: req.model,
        messages: [{ role: 'user', content: req.prompt }],
        max_tokens: req.max_tokens ?? 4096,
        ...(req.temperature !== undefined && { temperature: req.temperature }),
        ...(req.top_p !== undefined && { top_p: req.top_p }),
        ...(req.stop?.length && { stop_sequences: req.stop }),
    };
}

export function convertOpenAIRequestToClaude(req: OpenAIRequest): ClaudeRequest {
    const messages: ClaudeMessage[] = [];
    let system: string | undefined;
    if (!Array.isArray(req.messages)) {
        if (isUnknownRequest(req)) {
            return convertUnknownRequestToClaude(req)
        }
        console.log(JSON.stringify({ req }))
    }
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

export function convertOpenAIResponseToClaude(response: OpenAIResponse): ClaudeResponse {
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
        stop_reason: mapOpenAIFinishReasonToClaudeStopReason(choice.finish_reason),
        usage: {
            input_tokens: response.usage.prompt_tokens,
            output_tokens: response.usage.completion_tokens,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
        },
    };
}

export function mapOpenAIFinishReasonToClaudeStopReason(
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
