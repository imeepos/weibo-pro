import { Ast } from './base';
import type { Visitor } from './visitor';
import type {
    CodexRequest,
    CodexResponse,
    CodexResponseEvent,
} from '../types/codex';
import type { OpenAIRequest, OpenAIResponse, OpenAIStreamResponse } from '../types/openai';
import type { ClaudeRequest, ClaudeResponse, ClaudeStreamEvent } from '../types/claude';

export class CodexRequestAst extends Ast {
    provider: `codex` = `codex`
    type: `request` = `request`
    request!: CodexRequest;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitCodexRequestAst(this, ctx)
    }
}

export class CodexResponseAst extends Ast {
    provider: `codex` = `codex`
    type: `response` = `response`
    response!: CodexResponse;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitCodexResponseAst(this, ctx)
    }
}

export class OpenAIResponseAst extends Ast {
    provider: `codex` = `codex`
    type: `response` = `response`
    response!: OpenAIResponse;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitOpenAIResponseAst(this, ctx)
    }
}

export class OpenAiRequestAst extends Ast {
    provider: `openai` = `openai`
    type: `request` = `request`
    request!: OpenAIRequest;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitOpenAiRequestAst(this, ctx)
    }
}

export class ClaudeRequestAst extends Ast {
    provider: `claude` = `claude`
    type: `request` = `request`
    request!: ClaudeRequest;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitClaudeRequestAst(this, ctx)
    }
}

export class ClaudeResponseAst extends Ast {
    provider: `claude` = `claude`
    type: `response` = `response`
    response!: ClaudeResponse;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitClaudeResponseAst(this, ctx)
    }
}

export class OpenAIStreamResponseAst extends Ast {
    provider: `openai` = `openai`
    type: `stream` = `stream`
    streamEvent!: OpenAIStreamResponse;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitOpenAIStreamResponseAst(this, ctx)
    }
}

export class ClaudeStreamEventAst extends Ast {
    provider: `claude` = `claude`
    type: `stream` = `stream`
    streamEvent!: ClaudeStreamEvent;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitClaudeStreamEventAst(this, ctx)
    }
}

export class CodexStreamEventAst extends Ast {
    provider: `codex` = `codex`
    type: `stream` = `stream`
    streamEvent!: CodexResponseEvent;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitCodexStreamEventAst(this, ctx)
    }
}
