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
import type { ClaudeRequest, ClaudeResponse, ClaudeStreamEvent } from '../types/claude';
import { convertCodexToClaude, convertCodexResponseToClaude } from './codex-to-claude.converter';
import { convertOpenAIRequestToClaude, convertOpenAIResponseToClaude } from './openai-to-claude.converter';
import { convertOpenAIStreamToClaude, convertCodexStreamToClaude } from './stream-to-claude.converter';

@Injectable()
export class ToAnthropicVisitor extends BaseVisitor {
    visitCodexRequestAst(ast: CodexRequestAst, _ctx: any): ClaudeRequest {
        return convertCodexToClaude(ast.request);
    }

    visitCodexResponseAst(ast: CodexResponseAst, _ctx: any): ClaudeResponse {
        return convertCodexResponseToClaude(ast.response);
    }

    visitOpenAiRequestAst(ast: OpenAiRequestAst, _ctx: any): ClaudeRequest {
        return convertOpenAIRequestToClaude(ast.request);
    }

    visitOpenAIResponseAst(ast: OpenAIResponseAst, _ctx: any): ClaudeResponse {
        return convertOpenAIResponseToClaude(ast.response);
    }

    visitClaudeStreamEventAst(ast: ClaudeStreamEventAst, _ctx: any): ClaudeStreamEvent {
        return ast.streamEvent;
    }

    visitCodexStreamEventAst(ast: CodexStreamEventAst, ctx: any): ClaudeStreamEvent | null {
        return convertCodexStreamToClaude(ast.streamEvent, ctx);
    }

    visitOpenAIStreamResponseAst(ast: OpenAIStreamResponseAst, ctx: any): ClaudeStreamEvent[] {
        return convertOpenAIStreamToClaude(ast.streamEvent, ctx);
    }

    visitClaudeRequestAst(ast: ClaudeRequestAst, _ctx: any): ClaudeRequest {
        return ast.request;
    }

    visitClaudeResponseAst(ast: ClaudeResponseAst, _ctx: any): ClaudeResponse {
        return ast.response;
    }
}
