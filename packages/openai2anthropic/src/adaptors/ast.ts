import { claudeRequestToOpenai } from "../converters";
import { ClaudeRequest, ClaudeResponse, OpenAIRequest, OpenAIResponse } from "../types";
import { CodexRequest, CodexResponse } from "./types";

export abstract class Ast {
    abstract visit(visitor: Visitor, ctx: any): any;
}

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

export interface Visitor {
    visitCodexRequestAst(ast: CodexRequestAst, ctx: any): any;
    visitCodexResponseAst(ast: CodexResponseAst, ctx: any): any;
    visitOpenAiRequestAst(ast: OpenAiRequestAst, ctx: any): any;
    visitOpenAIResponseAst(ast: OpenAIResponseAst, ctx: any): any;
    visitClaudeRequestAst(ast: ClaudeRequestAst, ctx: any): any;
    visitClaudeResponseAst(ast: ClaudeResponseAst, ctx: any): any;
}

export class BaseVisitor implements Visitor {
    visitCodexRequestAst(ast: CodexRequestAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitCodexResponseAst(ast: CodexResponseAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitOpenAiRequestAst(ast: OpenAiRequestAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitOpenAIResponseAst(ast: OpenAIResponseAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitClaudeRequestAst(ast: ClaudeRequestAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitClaudeResponseAst(ast: ClaudeResponseAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    
}


export class ToCodexVisitor extends BaseVisitor { 
    visitCodexRequestAst(ast: CodexRequestAst, ctx: any): CodexRequest {
        return ast.request;
    }
    visitCodexResponseAst(ast: CodexResponseAst, ctx: any): CodexResponse {
        return ast.response
    }
    visitClaudeRequestAst(ast: ClaudeRequestAst, ctx: any): CodexRequest {
        
    }
    visitClaudeResponseAst(ast: ClaudeResponseAst, ctx: any): CodexResponse {
        
    }
    visitOpenAIResponseAst(ast: OpenAIResponseAst, ctx: any): CodexResponse {
        
    }
    visitOpenAiRequestAst(ast: OpenAiRequestAst, ctx: any): CodexRequest {
        
    }
}

