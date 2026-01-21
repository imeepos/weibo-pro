import { Observable } from 'rxjs'
import { AnthropicContentBlock, AnthropicToolUseBlock, AnthropicContentTextBlock, Ast } from './ast'

export interface OpenAIUsage {
    output_tokens: number
}

export interface OpenAIMessage {
    id: string
    role: 'assistant'
    content: OpenAIContentBlock[]
    usage: OpenAIUsage
}

export type OpenAIContentBlock = OpenAITextBlock | OpenAIToolUseBlock

export interface OpenAITextBlock {
    type: 'text'
    text: string
}

export interface OpenAIToolUseBlock {
    type: 'tool_use'
    id: string
    name: string
    input: Record<string, any>
}

export abstract class OpenAIAst {
    abstract visit(visitor: OpenAIVisitor, ctx: any): any
}

export interface OpenAIVisitor {
    visit(ast: OpenAIAst, ctx: any): any
    visitOpenAIMessageStartAst(ast: OpenAIMessageStartAst, ctx: any): any
    visitOpenAIContentBlockStartAst(ast: OpenAIContentBlockStartAst, ctx: any): any
    visitOpenAIContentBlockDeltaAst(ast: OpenAIContentBlockDeltaAst, ctx: any): any
    visitOpenAIContentBlockStopAst(ast: OpenAIContentBlockStopAst, ctx: any): any
    visitOpenAIMessageDeltaAst(ast: OpenAIMessageDeltaAst, ctx: any): any
    visitOpenAIMessageStopAst(ast: OpenAIMessageStopAst, ctx: any): any
}

export class OpenAIMessageStartAst extends OpenAIAst {
    type!: 'message_start'
    message!: OpenAIMessage
    visit(visitor: OpenAIVisitor, ctx: any) {
        return visitor.visitOpenAIMessageStartAst(this, ctx)
    }
}

export class OpenAIContentBlockStartAst extends OpenAIAst {
    type!: 'content_block_start'
    index!: number
    content_block!: { type: string; text?: string; id?: string; name?: string }
    visit(visitor: OpenAIVisitor, ctx: any) {
        return visitor.visitOpenAIContentBlockStartAst(this, ctx)
    }
}

export class OpenAIContentBlockDeltaAst extends OpenAIAst {
    type!: 'content_block_delta'
    index!: number
    delta!: { type: string; text?: string; partial_json?: string }
    visit(visitor: OpenAIVisitor, ctx: any) {
        return visitor.visitOpenAIContentBlockDeltaAst(this, ctx)
    }
}

export class OpenAIContentBlockStopAst extends OpenAIAst {
    type!: 'content_block_stop'
    index!: number
    visit(visitor: OpenAIVisitor, ctx: any) {
        return visitor.visitOpenAIContentBlockStopAst(this, ctx)
    }
}

export class OpenAIMessageDeltaAst extends OpenAIAst {
    type!: 'message_delta'
    delta!: Record<string, any>
    usage!: OpenAIUsage
    visit(visitor: OpenAIVisitor, ctx: any) {
        return visitor.visitOpenAIMessageDeltaAst(this, ctx)
    }
}

export class OpenAIMessageStopAst extends OpenAIAst {
    type!: 'message_stop'
    visit(visitor: OpenAIVisitor, ctx: any) {
        return visitor.visitOpenAIMessageStopAst(this, ctx)
    }
}

export type OpenAIResponseAst = OpenAIAst

interface Accumulator {
    message: OpenAIMessage | null
    contentBlocks: Map<number, OpenAIContentBlock>
    outputTokens: number
    partialJson: Map<number, string>
}

function isTextBlock(block: OpenAIContentBlock): block is OpenAITextBlock {
    return block.type === 'text'
}

function isToolUseBlock(block: OpenAIContentBlock): block is OpenAIToolUseBlock {
    return block.type === 'tool_use'
}

export function aggregateOpenAIStream(): (source: Observable<Ast>) => Observable<OpenAIMessage> {
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
                    if (ast instanceof OpenAIMessageStartAst) {
                        accumulator.message = ast.message
                        accumulator.contentBlocks.clear()
                        accumulator.outputTokens = 0
                        accumulator.partialJson.clear()
                    } else if (ast instanceof OpenAIContentBlockStartAst) {
                        const block = ast.content_block
                        if (block.type === 'text') {
                            accumulator.contentBlocks.set(ast.index, { type: 'text', text: block.text || '' })
                        } else if (block.type === 'tool_use') {
                            accumulator.partialJson.set(ast.index, '')
                            accumulator.contentBlocks.set(ast.index, {
                                type: 'tool_use',
                                id: block.id || '',
                                name: block.name || '',
                                input: {}
                            })
                        }
                    } else if (ast instanceof OpenAIContentBlockDeltaAst) {
                        const block = accumulator.contentBlocks.get(ast.index)
                        if (block) {
                            if (ast.delta.text && isTextBlock(block)) {
                                block.text += ast.delta.text
                            }
                            if (ast.delta.type === 'input_json_delta' && ast.delta.partial_json) {
                                const currentJson = accumulator.partialJson.get(ast.index) || ''
                                accumulator.partialJson.set(ast.index, currentJson + ast.delta.partial_json)
                            }
                        }
                    } else if (ast instanceof OpenAIContentBlockStopAst) {
                        const block = accumulator.contentBlocks.get(ast.index)
                        if (block && isToolUseBlock(block)) {
                            const jsonStr = accumulator.partialJson.get(ast.index) || '{}'
                            try {
                                block.input = JSON.parse(jsonStr)
                            } catch {
                                block.input = {}
                            }
                        }
                    } else if (ast instanceof OpenAIMessageDeltaAst) {
                        accumulator.outputTokens = ast.usage.output_tokens
                    } else if (ast instanceof OpenAIMessageStopAst) {
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

export interface OpenAIToolCall {
    id: string
    name: string
    input: Record<string, any>
}

export function extractOpenAIToolCalls(content: OpenAIContentBlock[]): OpenAIToolCall[] {
    return content
        .filter((block): block is OpenAIToolUseBlock => block.type === 'tool_use')
        .map(block => ({
            id: block.id,
            name: block.name,
            input: block.input
        }))
}
