import { Injectable } from '@sker/core'
import { Observable, reduce, firstValueFrom } from 'rxjs'
import {
    AnthropicRequestAst,
    AnthropicResponseAst,
    AnthropicMessageStartAst,
    AnthropicContentBlockDeltaAst,
    AnthropicContentBlockStartAst,
    AnthropicContentBlockStopAst,
    AnthropicMessageDeltaAst,
    AnthropicMessageStopAst,
    Ast,
    OpenAIRequestAst,
    OpenAiResponseAst,
    GoogleRequestAst,
    GoogleResponseAst,
    Visitor,
    AnthropicContentBlock,
    OpenAiToolCall
} from "./ast";
import { parseJson, parseStream } from './parser-stream';
import { aggregateAst, createEmptyAggregatedMessage, convertToAggregatedMessage } from './parser-aggregator';

export type { AggregatedMessage } from './parser-aggregator';

@Injectable()
export class ParserVisitor implements Visitor {
    visit(ast: Ast, ctx: any) {
        return ast.visit(this, ctx)
    }

    visitAnthropicRequestAst(ast: AnthropicRequestAst, ctx: any) {
        ast.model = ctx.model;
        ast.messages = ctx.messages;
        ast.max_tokens = ctx.max_tokens;
        ast.system = ctx.system;
        ast.temperature = ctx.temperature;
        ast.tools = ctx.tools;
        ast.stream = ctx.stream;
        return ast;
    }

    visitOpenAIRequestAst(ast: OpenAIRequestAst, ctx: any) {
        ast.model = ctx.model;
        ast.messages = ctx.messages;
        ast.temperature = ctx.temperature;
        ast.max_tokens = ctx.max_tokens;
        ast.tools = ctx.tools;
        ast.stream = ctx.stream;
        return ast;
    }

    visitGoogleRequestAst(ast: GoogleRequestAst, ctx: any) {
        ast.contents = ctx.contents;
        ast.generationConfig = ctx.generationConfig;
        ast.tools = ctx.tools;
        return ast;
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

    visitUnifiedRequestAst(ast: any, _ctx: any): any {
        return ast;
    }

    visitUnifiedResponseAst(ast: any, _ctx: any): any {
        return ast;
    }

    visitUnifiedStreamEventAst(ast: any, _ctx: any): any {
        return ast;
    }

    async visitResponse(response: Response): Promise<Ast | Observable<Ast>> {
        if (!response.ok) {
            const error = await response.text()
            throw new Error(`API Error: ${response.status} ${response.statusText}\n${error}`)
        }

        const contentType = response.headers.get('content-type') || ''

        if (contentType.includes('text/event-stream')) {
            return parseStream(response, this)
        }

        const data = await response.json()
        return parseJson(data, this)
    }

    async visitResponseAggregated(response: Response): Promise<ReturnType<typeof convertToAggregatedMessage>> {
        if (!response.ok) {
            const error = await response.text()
            throw new Error(`API Error: ${response.status} ${response.statusText}\n${error}`)
        }

        const contentType = response.headers.get('content-type') || ''

        if (contentType.includes('text/event-stream')) {
            return this.parseStreamAggregated(response)
        }

        const data = await response.json()
        return convertToAggregatedMessage(parseJson(data, this))
    }

    private async parseStreamAggregated(response: Response): Promise<ReturnType<typeof convertToAggregatedMessage>> {
        const stream$ = parseStream(response, this)
        const result = await firstValueFrom(
            stream$.pipe(
                reduce((acc, ast) => aggregateAst(acc, ast), createEmptyAggregatedMessage())
            )
        )
        // 解析 tool_use 的 input JSON
        for (const block of result._contentBlocks) {
            if (block?.type === 'tool_use' && block._inputJson) {
                let jsonStr = block._inputJson.trim()
                // 兼容某些模型不发送开头 { 的情况
                if (!jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
                    jsonStr = '{' + jsonStr
                }
                try {
                    block.input = JSON.parse(jsonStr)
                } catch {
                    // ignore
                }
                delete block._inputJson
            }
        }
        result.content = result._contentBlocks.filter(Boolean) as AnthropicContentBlock[]
        // 清理内部字段
        delete (result as any)._contentBlocks
        delete (result as any)._toolCallsMap
        return result
    }
}
