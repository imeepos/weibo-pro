import type { ClaudeRequest, ClaudeResponse } from '../types/claude';
import type { OpenAIRequest, OpenAIResponse, OpenAIMessage } from '../types/openai';

/**
 * 将 Claude 请求转换为 OpenAI Chat Completions 请求
 */
export function convertClaudeRequestToOpenAI(req: ClaudeRequest): OpenAIRequest {
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

/**
 * 将 Claude 响应转换为 OpenAI Chat Completions 响应
 */
export function convertClaudeResponseToOpenAI(response: ClaudeResponse): OpenAIResponse {
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
            finish_reason: mapClaudeStopReasonToOpenAI(response.stop_reason),
        }],
        usage: {
            prompt_tokens: response.usage?.input_tokens || 0,
            completion_tokens: response.usage?.output_tokens || 0,
            total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        },
    };
}

/**
 * 将 Claude stop_reason 映射为 OpenAI finish_reason
 */
export function mapClaudeStopReasonToOpenAI(
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
