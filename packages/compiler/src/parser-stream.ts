import { Observable } from 'rxjs'
import {
    AnthropicResponseAst,
    AnthropicMessageStartAst,
    AnthropicContentBlockDeltaAst,
    AnthropicContentBlockStartAst,
    AnthropicContentBlockStopAst,
    AnthropicMessageDeltaAst,
    AnthropicMessageStopAst,
    Ast,
    OpenAiResponseAst,
    GoogleResponseAst
} from "./ast";
import type { ParserVisitor } from './parser';

export function parseStream(response: Response, visitor: ParserVisitor): Observable<Ast> {
    return new Observable(subscriber => {
        const reader = response.body?.getReader()
        if (!reader) {
            subscriber.error(new Error('No response body'))
            return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        const processStream = async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            const data = line.slice(5).trim()
                            if (data === '[DONE]') continue

                            try {
                                const json = JSON.parse(data)
                                const ast = parseJson(json, visitor)
                                subscriber.next(ast)
                            } catch (_e) {
                                // Skip invalid JSON
                            }
                        }
                    }
                }
                subscriber.complete()
            } catch (error) {
                subscriber.error(error)
            }
        }

        processStream()

        return () => reader.cancel()
    })
}

export function parseJson(data: any, visitor: ParserVisitor): Ast {
    if (data.choices) {
        return visitor.visitOpenAiResponseAst(new OpenAiResponseAst(), data)
    }

    if (data.type === 'message_start') {
        return visitor.visitAnthropicMessageStartAst(new AnthropicMessageStartAst(), data)
    }

    if (data.type === 'content_block_delta') {
        return visitor.visitAnthropicContentBlockDeltaAst(new AnthropicContentBlockDeltaAst(), data)
    }

    if (data.type === 'content_block_start') {
        return visitor.visitAnthropicContentBlockStartAst(new AnthropicContentBlockStartAst(), data)
    }

    if (data.type === 'content_block_stop') {
        return visitor.visitAnthropicContentBlockStopAst(new AnthropicContentBlockStopAst(), data)
    }

    if (data.type === 'message_delta') {
        return visitor.visitAnthropicMessageDeltaAst(new AnthropicMessageDeltaAst(), data)
    }

    if (data.type === 'message_stop') {
        return visitor.visitAnthropicMessageStopAst(new AnthropicMessageStopAst(), data)
    }

    if (data.content || data.type === 'message') {
        return visitor.visitAnthropicResponseAst(new AnthropicResponseAst(), data)
    }

    if (data.candidates) {
        return visitor.visitGoogleResponseAst(new GoogleResponseAst(), data)
    }

    throw new Error(`Unknown response format: ${JSON.stringify(data)}`)
}
