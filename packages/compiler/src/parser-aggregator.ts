import {
    AnthropicResponseAst,
    AnthropicContentBlockDeltaAst,
    AnthropicContentBlockStartAst,
    AnthropicMessageDeltaAst,
    AnthropicMessageStartAst,
    OpenAiResponseAst,
    GoogleResponseAst,
    Ast,
    AnthropicContentBlock,
    OpenAiToolCall
} from "./ast";

export interface AggregatedMessage {
    content?: string | AnthropicContentBlock[]
    tool_calls?: OpenAiToolCall[]
    finish_reason?: string | null
    stop_reason?: string | null
    id?: string
    model?: string
    role?: string
    usage?: any
}

export interface AggregateState extends AggregatedMessage {
    _contentBlocks: any[]
    _toolCallsMap: Map<number, OpenAiToolCall>
}

export function createEmptyAggregatedMessage(): AggregateState {
    return {
        content: undefined,
        tool_calls: undefined,
        finish_reason: null,
        stop_reason: null,
        id: undefined,
        model: undefined,
        role: undefined,
        usage: undefined,
        _contentBlocks: [],
        _toolCallsMap: new Map()
    }
}

export function aggregateAst(acc: AggregateState, ast: Ast): AggregateState {
    if (ast instanceof OpenAiResponseAst) {
        return aggregateOpenAi(acc, ast)
    }
    if (ast instanceof AnthropicMessageStartAst) {
        return aggregateAnthropicMessageStart(acc, ast)
    }
    if (ast instanceof AnthropicContentBlockStartAst) {
        return aggregateAnthropicContentBlockStart(acc, ast)
    }
    if (ast instanceof AnthropicContentBlockDeltaAst) {
        return aggregateAnthropicContentBlockDelta(acc, ast)
    }
    if (ast instanceof AnthropicMessageDeltaAst) {
        return aggregateAnthropicMessageDelta(acc, ast)
    }
    return acc
}

export function aggregateOpenAi(acc: AggregateState, ast: OpenAiResponseAst): AggregateState {
    if (!acc.id && ast.id) acc.id = ast.id
    if (!acc.model && ast.model) acc.model = ast.model
    if (ast.usage) acc.usage = ast.usage

    const choice = ast.choices?.[0]
    if (!choice) return acc

    if (choice.finish_reason) {
        acc.finish_reason = choice.finish_reason
    }

    const delta = choice.delta
    if (!delta) return acc

    if (!acc.role && delta.role) acc.role = delta.role

    if (delta.content) {
        acc.content = (acc.content as string || '') + delta.content
    }

    if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
            const existing = acc._toolCallsMap.get(tc.index)
            if (existing) {
                if (tc.function?.arguments) {
                    existing.function = existing.function || { name: '', arguments: '' }
                    existing.function.arguments = (existing.function.arguments || '') + tc.function.arguments
                }
            } else {
                acc._toolCallsMap.set(tc.index, {
                    index: tc.index,
                    id: tc.id,
                    type: tc.type,
                    function: tc.function ? { name: tc.function.name || '', arguments: tc.function.arguments || '' } : undefined
                })
            }
        }
        acc.tool_calls = Array.from(acc._toolCallsMap.values())
    }

    return acc
}

export function aggregateAnthropicMessageStart(acc: AggregateState, ast: AnthropicMessageStartAst): AggregateState {
    acc.id = ast.message.id
    acc.model = ast.message.model
    acc.role = ast.message.role
    acc.usage = ast.message.usage
    return acc
}

export function aggregateAnthropicContentBlockStart(acc: AggregateState, ast: AnthropicContentBlockStartAst): AggregateState {
    const block = ast.content_block
    if (block.type === 'text') {
        acc._contentBlocks[ast.index] = { type: 'text', text: block.text || '' }
    } else if (block.type === 'thinking') {
        acc._contentBlocks[ast.index] = { type: 'thinking', thinking: block.thinking || '', signature: '' }
    } else if (block.type === 'tool_use') {
        acc._contentBlocks[ast.index] = { type: 'tool_use', id: block.id, name: block.name, input: {} }
    }
    return acc
}

export function aggregateAnthropicContentBlockDelta(acc: AggregateState, ast: AnthropicContentBlockDeltaAst): AggregateState {
    const block = acc._contentBlocks[ast.index]
    if (!block) return acc

    if (ast.delta.type === 'text_delta' && ast.delta.text) {
        block.text = (block.text || '') + ast.delta.text
    } else if (ast.delta.type === 'thinking_delta' && ast.delta.thinking) {
        block.thinking = (block.thinking || '') + ast.delta.thinking
    } else if (ast.delta.type === 'signature_delta' && ast.delta.signature) {
        block.signature = (block.signature || '') + ast.delta.signature
    } else if (ast.delta.type === 'input_json_delta' && ast.delta.partial_json !== undefined) {
        block._inputJson = (block._inputJson || '') + ast.delta.partial_json
    }

    acc.content = acc._contentBlocks.filter(Boolean) as AnthropicContentBlock[]
    return acc
}

export function aggregateAnthropicMessageDelta(acc: AggregateState, ast: AnthropicMessageDeltaAst): AggregateState {
    if (ast.delta.stop_reason) {
        acc.stop_reason = ast.delta.stop_reason
    }
    if (ast.usage) {
        acc.usage = { ...acc.usage, output_tokens: ast.usage.output_tokens }
    }
    return acc
}

export function convertToAggregatedMessage(ast: Ast): AggregatedMessage {
    if (ast instanceof OpenAiResponseAst) {
        const choice = ast.choices?.[0]
        return {
            id: ast.id,
            model: ast.model,
            role: choice?.delta?.role,
            content: choice?.delta?.content,
            tool_calls: choice?.delta?.tool_calls,
            finish_reason: choice?.finish_reason,
            usage: ast.usage
        }
    }
    if (ast instanceof AnthropicResponseAst) {
        return {
            id: ast.id,
            model: ast.model,
            role: ast.role,
            content: ast.content,
            stop_reason: ast.stop_reason,
            usage: ast.usage
        }
    }
    if (ast instanceof GoogleResponseAst) {
        const candidate = ast.candidates?.[0]
        const content = candidate?.content
        return {
            model: ast.modelVersion,
            role: content?.role === 'model' ? 'assistant' : content?.role,
            content: content?.parts?.map(p => 'text' in p ? p.text : '').join(''),
            finish_reason: candidate?.finishReason,
            usage: ast.usageMetadata
        }
    }
    return {}
}
