import type { Ast } from './base';
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

export interface Visitor {
    visit(ast: Ast, ctx: any): any;
    visitCodexRequestAst(ast: CodexRequestAst, ctx: any): any;
    visitCodexResponseAst(ast: CodexResponseAst, ctx: any): any;
    visitOpenAiRequestAst(ast: OpenAiRequestAst, ctx: any): any;
    visitOpenAIResponseAst(ast: OpenAIResponseAst, ctx: any): any;
    visitClaudeRequestAst(ast: ClaudeRequestAst, ctx: any): any;
    visitClaudeResponseAst(ast: ClaudeResponseAst, ctx: any): any;
    visitOpenAIStreamResponseAst(ast: OpenAIStreamResponseAst, ctx: any): any;
    visitClaudeStreamEventAst(ast: ClaudeStreamEventAst, ctx: any): any;
    visitCodexStreamEventAst(ast: CodexStreamEventAst, ctx: any): any;
}

export class BaseVisitor implements Visitor {
    visit(ast: Ast, ctx: any) {
        return ast.visit(this, ctx)
    }
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
    visitOpenAIStreamResponseAst(ast: OpenAIStreamResponseAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitClaudeStreamEventAst(ast: ClaudeStreamEventAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitCodexStreamEventAst(ast: CodexStreamEventAst, ctx: any) {
        throw new Error("Method not implemented.");
    }
}
