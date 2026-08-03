import { Ast, Visitor } from './ast-common';

// ==================== OpenAI Request Types ====================
export type OpenAIRequestRole = 'system' | 'user' | 'assistant' | 'tool';

export interface OpenAIRequestMessage {
    role: OpenAIRequestRole;
    content: string;
    name?: string;
    tool_calls?: OpenAiToolCall[];
    tool_call_id?: string;
}

export interface OpenAIFunction {
    name: string;
    description: string;
    parameters: Record<string, any>;
}

export interface OpenAITool {
    type: 'function';
    function: OpenAIFunction;
}

export class OpenAIRequestAst extends Ast {
    model!: string;
    messages!: OpenAIRequestMessage[];
    temperature?: number;
    max_tokens?: number;
    tools?: OpenAITool[];
    stream?: boolean;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitOpenAIRequestAst(this, ctx);
    }
}

// ==================== OpenAI Response Types ====================
export type OpenAIRole = `assistant`;
export interface OpenAiToolCall {
    index: number;
    id?: string;
    type?: string;
    function?: {
        name?: string;
        arguments?: string;
    };
}
export interface OpenAiDelta {
    content: string;
    role: OpenAIRole;
    reasoning_content: string | null;
    tool_calls?: OpenAiToolCall[];
}
export interface OpenAiChoice {
    index: number;
    finish_reason: string | null;
    delta: OpenAiDelta;
}
export interface OpenAiUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}
export class OpenAiResponseAst extends Ast {
    id!: string;
    object!: string;
    created!: number;
    model!: string;
    system_fingerprint!: string;
    usage!: OpenAiUsage;
    choices!: OpenAiChoice[];
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitOpenAiResponseAst(this, ctx);
    }
}
