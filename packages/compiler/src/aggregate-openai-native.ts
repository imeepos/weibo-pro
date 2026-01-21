import { Observable } from 'rxjs'
import { OpenAiToolCall, OpenAiDelta, OpenAiResponseAst, Ast } from './ast'

export interface OpenAIResponseMessage {
    id: string
    role: string
    content: string
    tool_calls?: OpenAIToolCallResult[]
    finish_reason: string | null
}

export interface OpenAIToolCallResult {
    id: string
    type: string
    function: {
        name: string
        arguments: string
    }
}

interface Accumulator {
    messageId: string | null
    role: string | null
    content: string
    toolCalls: Map<number, OpenAIToolCallResult>
    finishReason: string | null
}

export function aggregateOpenAIStreamNative(): (source: Observable<Ast>) => Observable<OpenAIResponseMessage> {
    return (source: Observable<Ast>) => {
        return new Observable(subscriber => {
            const accumulator: Accumulator = {
                messageId: null,
                role: null,
                content: '',
                toolCalls: new Map(),
                finishReason: null
            }

            const subscription = source.subscribe({
                next: (ast) => {
                    if (ast instanceof OpenAiResponseAst) {
                        const chunk = ast as OpenAiResponseAst

                        if (!accumulator.messageId && chunk.id) {
                            accumulator.messageId = chunk.id
                        }

                        const choice = chunk.choices?.[0]
                        if (!choice) return

                        const delta = choice.delta

                        // Handle role
                        if (delta.role) {
                            accumulator.role = delta.role
                        }

                        // Handle content
                        if (delta.content) {
                            accumulator.content += delta.content
                        }

                        // Handle tool calls
                        if (delta.tool_calls) {
                            for (const toolCall of delta.tool_calls) {
                                const index = toolCall.index
                                let existing = accumulator.toolCalls.get(index)

                                if (!existing) {
                                    existing = {
                                        id: toolCall.id || '',
                                        type: toolCall.type || 'function',
                                        function: {
                                            name: toolCall.function?.name || '',
                                            arguments: ''
                                        }
                                    }
                                    accumulator.toolCalls.set(index, existing)
                                }

                                // Append arguments
                                if (toolCall.function?.arguments) {
                                    existing.function.arguments += toolCall.function.arguments
                                }

                                // Update id if provided in later chunks
                                if (toolCall.id && !existing.id) {
                                    existing.id = toolCall.id
                                }

                                // Update type if provided
                                if (toolCall.type && !existing.type) {
                                    existing.type = toolCall.type
                                }

                                // Update name if provided
                                if (toolCall.function?.name && !existing.function.name) {
                                    existing.function.name = toolCall.function.name
                                }
                            }
                        }

                        // Handle finish reason
                        if (choice.finish_reason) {
                            accumulator.finishReason = choice.finish_reason
                        }
                    }
                },
                error: (err) => subscriber.error(err),
                complete: () => {
                    const result: OpenAIResponseMessage = {
                        id: accumulator.messageId || '',
                        role: accumulator.role || 'assistant',
                        content: accumulator.content,
                        finish_reason: accumulator.finishReason || null
                    }

                    if (accumulator.toolCalls.size > 0) {
                        result.tool_calls = Array.from(accumulator.toolCalls.values())
                    }

                    subscriber.next(result)
                    subscriber.complete()
                }
            })

            return () => {
                subscription.unsubscribe()
            }
        })
    }
}
