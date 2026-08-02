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
    visitCodexRequestAst(_ast: CodexRequestAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitCodexResponseAst(_ast: CodexResponseAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitOpenAiRequestAst(_ast: OpenAiRequestAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitOpenAIResponseAst(_ast: OpenAIResponseAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitClaudeRequestAst(_ast: ClaudeRequestAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitClaudeResponseAst(_ast: ClaudeResponseAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitOpenAIStreamResponseAst(_ast: OpenAIStreamResponseAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitClaudeStreamEventAst(_ast: ClaudeStreamEventAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
    visitCodexStreamEventAst(_ast: CodexStreamEventAst, _ctx: any) {
        throw new Error("Method not implemented.");
    }
}
