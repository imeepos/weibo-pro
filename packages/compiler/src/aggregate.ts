import { Observable } from 'rxjs'
import { AnthropicResponseAst, AnthropicContentBlock, AnthropicMessageStartAst, AnthropicContentBlockStartAst, AnthropicContentBlockDeltaAst, AnthropicContentBlockStopAst, AnthropicMessageDeltaAst, AnthropicMessageStopAst, Ast, AnthropicToolUseBlock, AnthropicContentTextBlock, AnthropicContentThinkingBlock } from './ast'

interface Accumulator {
    message: AnthropicResponseAst | null
    contentBlocks: Map<number, AnthropicContentBlock>
    outputTokens: number
    partialJson: Map<number, string>
}

function isTextBlock(block: AnthropicContentBlock): block is AnthropicContentTextBlock {
    return block.type === 'text'
}

function isThinkingBlock(block: AnthropicContentBlock): block is AnthropicContentThinkingBlock {
    return block.type === 'thinking'
}

function isToolUseBlock(block: AnthropicContentBlock): block is AnthropicToolUseBlock {
    return block.type === 'tool_use'
}

export function aggregateAnthropicStream(): (source: Observable<Ast>) => Observable<AnthropicResponseAst> {
    return (source: Observable<Ast>) => {
        return new Observable(subscriber => {
            const accumulator: Accumulator = {
                message: null,
                contentBlocks: new Map(),
                outputTokens: 0,
                partialJson: new Map()
            }

            const subscription = source.subscribe({
                next: (ast) => {
                    if (ast instanceof AnthropicMessageStartAst) {
                        accumulator.message = ast.message
                        accumulator.contentBlocks.clear()
                        accumulator.outputTokens = 0
                        accumulator.partialJson.clear()
                    } else if (ast instanceof AnthropicContentBlockStartAst) {
                        const block = ast.content_block
                        if (block.type === 'text') {
                            accumulator.contentBlocks.set(ast.index, { type: 'text', text: block.text || '' })
                        } else if (block.type === 'thinking') {
                            accumulator.contentBlocks.set(ast.index, { type: 'thinking', thinking: block.thinking || '', signature: '' })
                        } else if (block.type === 'tool_use') {
                            accumulator.partialJson.set(ast.index, '')
                            accumulator.contentBlocks.set(ast.index, {
                                type: 'tool_use',
                                id: block.id || '',
                                name: block.name || '',
                                input: {}
                            })
                        }
                    } else if (ast instanceof AnthropicContentBlockDeltaAst) {
                        const block = accumulator.contentBlocks.get(ast.index)
                        if (block) {
                            if (ast.delta.text && isTextBlock(block)) {
                                block.text += ast.delta.text
                            }
                            if (ast.delta.thinking && isThinkingBlock(block)) {
                                block.thinking += ast.delta.thinking
                            }
                            if (ast.delta.signature && isThinkingBlock(block)) {
                                block.signature = ast.delta.signature
                            }
                            if (ast.delta.type === 'input_json_delta' && ast.delta.partial_json) {
                                const currentJson = accumulator.partialJson.get(ast.index) || ''
                                accumulator.partialJson.set(ast.index, currentJson + ast.delta.partial_json)
                            }
                        }
                    } else if (ast instanceof AnthropicContentBlockStopAst) {
                        const block = accumulator.contentBlocks.get(ast.index)
                        if (block && isToolUseBlock(block)) {
                            const jsonStr = accumulator.partialJson.get(ast.index) || '{}'
                            try {
                                block.input = JSON.parse(jsonStr)
                            } catch {
                                block.input = {}
                            }
                        }
                    } else if (ast instanceof AnthropicMessageDeltaAst) {
                        accumulator.outputTokens = ast.usage.output_tokens
                    } else if (ast instanceof AnthropicMessageStopAst) {
                        if (accumulator.message) {
                            accumulator.message.content = Array.from(accumulator.contentBlocks.values())
                            accumulator.message.usage.output_tokens = accumulator.outputTokens
                            subscriber.next(accumulator.message)
                        }
                        subscriber.complete()
                    }
                },
                error: (err) => subscriber.error(err),
                complete: () => subscriber.complete()
            })

            return () => {
                subscription.unsubscribe()
            }
        })
    }
}
