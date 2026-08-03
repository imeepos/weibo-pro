import { Injectable } from '@sker/core';
import { BaseVisitor } from './visitor';
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
import type { OpenAIRequest, OpenAIResponse, OpenAIStreamResponse } from '../types/openai';
import { convertClaudeRequestToOpenAI, convertClaudeResponseToOpenAI } from './claude-to-openai.converter';
import { convertCodexToOpenAI, convertCodexResponseToOpenAI } from './codex-to-openai.converter';
import { convertClaudeStreamToOpenAI, convertCodexStreamToOpenAI } from './stream-to-openai.converter';

/**
 * AST -> OpenAI 协议转换 visitor
 */
@Injectable()
export class ToOpenAiVisitor extends BaseVisitor {
    visitCodexRequestAst(ast: CodexRequestAst, _ctx: any): OpenAIRequest {
        return convertCodexToOpenAI(ast.request);
    }

    visitCodexResponseAst(ast: CodexResponseAst, _ctx: any): OpenAIResponse {
        return convertCodexResponseToOpenAI(ast.response);
    }

    visitOpenAiRequestAst(ast: OpenAiRequestAst, _ctx: any): OpenAIRequest {
        return ast.request;
    }

    visitOpenAIResponseAst(ast: OpenAIResponseAst, _ctx: any): OpenAIResponse {
        return ast.response;
    }

    visitClaudeRequestAst(ast: ClaudeRequestAst, _ctx: any): OpenAIRequest {
        return convertClaudeRequestToOpenAI(ast.request);
    }

    visitClaudeResponseAst(ast: ClaudeResponseAst, _ctx: any): OpenAIResponse {
        return convertClaudeResponseToOpenAI(ast.response);
    }

    visitOpenAIStreamResponseAst(ast: OpenAIStreamResponseAst, _ctx: any): OpenAIStreamResponse {
        return ast.streamEvent;
    }

    visitCodexStreamEventAst(ast: CodexStreamEventAst, ctx: any): OpenAIStreamResponse | null {
        return convertCodexStreamToOpenAI(ast.streamEvent, ctx);
    }

    visitClaudeStreamEventAst(ast: ClaudeStreamEventAst, ctx: any): OpenAIStreamResponse | null {
        return convertClaudeStreamToOpenAI(ast.streamEvent, ctx);
    }
}
