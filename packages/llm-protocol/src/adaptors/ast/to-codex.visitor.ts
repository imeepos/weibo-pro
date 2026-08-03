import { Injectable } from '@sker/core';
import { BaseVisitor } from './visitor';
import { OpenAIToCodexConverter } from '../openai-to-codex.converter';
import { convertClaudeToCodex, convertClaudeResponseToCodex } from './claude-to-codex.converter';
import { convertOpenAIResponseToCodex } from './openai-response-to-codex.converter';
import { convertOpenAIStreamToCodex, convertClaudeStreamToCodex } from './stream-to-codex.converter';
import type {
    CodexRequest,
    CodexResponse,
    CodexResponseEvent,
} from '../types/codex';
import type {
    CodexRequestAst,
    CodexResponseAst,
    OpenAiRequestAst,
    OpenAIResponseAst,
    ClaudeRequestAst,
    ClaudeResponseAst,
    OpenAIStreamResponseAst,
    ClaudeStreamEventAst,
    CodexStreamEventAst,
} from './nodes';

/**
 * AST -> Codex 协议转换 visitor
 */
@Injectable()
export class ToCodexVisitor extends BaseVisitor {
    private openaiConverter = new OpenAIToCodexConverter();

    visitCodexRequestAst(ast: CodexRequestAst, _ctx: any): CodexRequest {
        return ast.request;
    }

    visitCodexResponseAst(ast: CodexResponseAst, _ctx: any): CodexResponse {
        return ast.response;
    }

    visitClaudeRequestAst(ast: ClaudeRequestAst, _ctx: any): CodexRequest {
        return convertClaudeToCodex(ast.request);
    }

    visitClaudeResponseAst(ast: ClaudeResponseAst, _ctx: any): CodexResponse {
        return convertClaudeResponseToCodex(ast.response);
    }

    visitOpenAIResponseAst(ast: OpenAIResponseAst, _ctx: any): CodexResponse {
        return convertOpenAIResponseToCodex(ast.response);
    }

    visitOpenAiRequestAst(ast: OpenAiRequestAst, _ctx: any): CodexRequest {
        return this.openaiConverter.convert(ast.request);
    }

    visitOpenAIStreamResponseAst(ast: OpenAIStreamResponseAst, ctx: any): CodexResponseEvent | null {
        return convertOpenAIStreamToCodex(ast.streamEvent, ctx);
    }

    visitClaudeStreamEventAst(ast: ClaudeStreamEventAst, ctx: any): CodexResponseEvent | null {
        return convertClaudeStreamToCodex(ast.streamEvent, ctx);
    }

    visitCodexStreamEventAst(ast: CodexStreamEventAst, _ctx: any): CodexResponseEvent {
        return ast.streamEvent;
    }
}
