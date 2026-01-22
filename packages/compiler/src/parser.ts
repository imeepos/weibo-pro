import { Injectable } from '@sker/core'
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
    GoogleResponseAst,
    Visitor
} from "./ast";

@Injectable()
export class ParserVisitor implements Visitor {
    visit(ast: Ast, ctx: any) {
        return ast.visit(this, ctx)
    }

    visitOpenAiResponseAst(ast: OpenAiResponseAst, ctx: any) {
        ast.id = ctx.id;
        ast.created = ctx.created;
        ast.model = ctx.model;
        ast.object = ctx.object;
        ast.system_fingerprint = ctx.system_fingerprint;
        ast.usage = ctx.usage;
        ast.choices = ctx.choices;
        return ast;
    }

    visitGoogleResponseAst(ast: GoogleResponseAst, ctx: any) {
        ast.candidates = ctx.candidates;
        ast.usageMetadata = ctx.usageMetadata;
        ast.modelVersion = ctx.modelVersion;
        return ast;
    }

    visitAnthropicResponseAst(ast: AnthropicResponseAst, ctx: any) {
        ast.id = ctx.id;
        ast.content = ctx.content;
        ast.model = ctx.model;
        ast.role = ctx.role;
        ast.stop_reason = ctx.stop_reason;
        ast.stop_sequence = ctx.stop_sequence;
        ast.type = ctx.type;
        ast.usage = ctx.usage;
        return ast;
    }

    visitAnthropicMessageStartAst(ast: AnthropicMessageStartAst, ctx: any) {
        ast.type = ctx.type;
        ast.message = this.visitAnthropicResponseAst(new AnthropicResponseAst(), ctx.message);
        return ast;
    }

    visitAnthropicContentBlockDeltaAst(ast: AnthropicContentBlockDeltaAst, ctx: any) {
        ast.type = ctx.type;
        ast.index = ctx.index;
        ast.delta = ctx.delta;
        return ast;
    }

    visitAnthropicContentBlockStartAst(ast: AnthropicContentBlockStartAst, ctx: any) {
        ast.type = ctx.type;
        ast.index = ctx.index;
        ast.content_block = ctx.content_block;
        return ast;
    }

    visitAnthropicContentBlockStopAst(ast: AnthropicContentBlockStopAst, ctx: any) {
        ast.type = ctx.type;
        ast.index = ctx.index;
        return ast;
    }

    visitAnthropicMessageDeltaAst(ast: AnthropicMessageDeltaAst, ctx: any) {
        ast.type = ctx.type;
        ast.delta = ctx.delta;
        ast.usage = ctx.usage;
        return ast;
    }

    visitAnthropicMessageStopAst(ast: AnthropicMessageStopAst, ctx: any) {
        ast.type = ctx.type;
        return ast;
    }

    async visitResponse(response: Response): Promise<Ast | Observable<Ast>> {
        if (!response.ok) {
            const error = await response.text()
            throw new Error(`API Error: ${response.status} ${response.statusText}\n${error}`)
        }

        const contentType = response.headers.get('content-type') || ''

        if (contentType.includes('text/event-stream')) {
            return this.parseStream(response)
        }

        const data = await response.json()
        return this.parseJson(data)
    }

    private parseStream(response: Response): Observable<Ast> {
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
                                    const ast = this.parseJson(json)
                                    subscriber.next(ast)
                                } catch (e) {
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

    private parseJson(data: any): Ast {
        if (data.choices) {
            return this.visitOpenAiResponseAst(new OpenAiResponseAst(), data)
        }

        if (data.type === 'message_start') {
            return this.visitAnthropicMessageStartAst(new AnthropicMessageStartAst(), data)
        }

        if (data.type === 'content_block_delta') {
            return this.visitAnthropicContentBlockDeltaAst(new AnthropicContentBlockDeltaAst(), data)
        }

        if (data.type === 'content_block_start') {
            return this.visitAnthropicContentBlockStartAst(new AnthropicContentBlockStartAst(), data)
        }

        if (data.type === 'content_block_stop') {
            return this.visitAnthropicContentBlockStopAst(new AnthropicContentBlockStopAst(), data)
        }

        if (data.type === 'message_delta') {
            return this.visitAnthropicMessageDeltaAst(new AnthropicMessageDeltaAst(), data)
        }

        if (data.type === 'message_stop') {
            return this.visitAnthropicMessageStopAst(new AnthropicMessageStopAst(), data)
        }

        if (data.content || data.type === 'message') {
            return this.visitAnthropicResponseAst(new AnthropicResponseAst(), data)
        }

        if (data.candidates) {
            return this.visitGoogleResponseAst(new GoogleResponseAst(), data)
        }

        throw new Error(`Unknown response format: ${JSON.stringify(data)}`)
    }
}