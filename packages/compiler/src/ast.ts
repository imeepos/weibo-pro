

export abstract class Ast {
    abstract visit(visitor: Visitor, ctx: any): any;
}

// ==================== Anthropic Request Types ====================
export type AnthropicRequestRole = 'user' | 'assistant';

export interface AnthropicRequestMessage {
    role: AnthropicRequestRole;
    content: string | AnthropicContentBlock[];
}

export interface AnthropicToolInputSchema {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
}

export interface AnthropicTool {
    name: string;
    description: string;
    input_schema: AnthropicToolInputSchema;
}

export class AnthropicRequestAst extends Ast {
    model!: string;
    messages!: AnthropicRequestMessage[];
    max_tokens!: number;
    system?: string;
    temperature?: number;
    tools?: AnthropicTool[];
    stream?: boolean;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicRequestAst(this, ctx);
    }
}

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

// ==================== Google Request Types ====================
export interface GoogleGenerationConfig {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
}

export interface GoogleToolFunctionDeclaration {
    name: string;
    description: string;
    parameters: Record<string, any>;
}

export interface GoogleTool {
    functionDeclarations: GoogleToolFunctionDeclaration[];
}

export class GoogleRequestAst extends Ast {
    contents!: GoogleContent[];
    generationConfig?: GoogleGenerationConfig;
    tools?: GoogleTool[];
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitGoogleRequestAst(this, ctx);
    }
}

// ==================== Anthropic Response Types ====================
export type AnthropicRole = `assistant`
export interface AnthropicUsage {
    input_tokens: number;
    output_tokens: number;
}
export interface AnthropicContentThinkingBlock {
    type: 'thinking';
    thinking: string;
    signature: string;
}
export interface AnthropicContentTextBlock {
    text: string;
    type: `text`;
}
export interface AnthropicToolUseBlock {
    type: 'tool_use';
    id: string;
    name: string;
    input: Record<string, any>;
}
export type AnthropicContentBlock = AnthropicContentTextBlock | AnthropicContentThinkingBlock | AnthropicToolUseBlock;

export class AnthropicResponseAst extends Ast {
    id!: string;
    model!: string;
    role!: AnthropicRole;
    stop_reason!: string;
    stop_sequence!: null | string;
    type!: string;
    usage!: AnthropicUsage;
    content!: AnthropicContentBlock[];
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicResponseAst(this, ctx);
    }
}

export class AnthropicMessageStartAst extends Ast {
    type!: 'message_start';
    message!: AnthropicResponseAst;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicMessageStartAst(this, ctx);
    }
}

export class AnthropicContentBlockDeltaAst extends Ast {
    type!: 'content_block_delta';
    index!: number;
    delta!: { type: string; text?: string; thinking?: string; signature?: string; partial_json?: string };
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicContentBlockDeltaAst(this, ctx);
    }
}

export class AnthropicContentBlockStartAst extends Ast {
    type!: 'content_block_start';
    index!: number;
    content_block!: { type: string; text?: string; thinking?: string; id?: string; name?: string };
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicContentBlockStartAst(this, ctx);
    }
}

export class AnthropicContentBlockStopAst extends Ast {
    type!: 'content_block_stop';
    index!: number;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicContentBlockStopAst(this, ctx);
    }
}

export class AnthropicMessageDeltaAst extends Ast {
    type!: 'message_delta';
    delta!: { stop_reason?: string; stop_sequence?: string | null };
    usage!: { output_tokens: number };
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicMessageDeltaAst(this, ctx);
    }
}

export class AnthropicMessageStopAst extends Ast {
    type!: 'message_stop';
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitAnthropicMessageStopAst(this, ctx);
    }
}
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

// Google Vertex AI 类型定义
export interface GoogleFunctionCall {
    name: string;
    args: Record<string, unknown>;
}

export interface GoogleFunctionResponse {
    name: string;
    response: {
        content: string;
    };
}

export interface GoogleTextPart {
    text: string;
}

export interface GoogleFunctionCallPart {
    functionCall: GoogleFunctionCall;
    thoughtSignature: string;
}

export interface GoogleFunctionResponsePart {
    functionResponse: GoogleFunctionResponse;
    thoughtSignature: string;
}

export type GoogleContentPart = GoogleTextPart | GoogleFunctionCallPart | GoogleFunctionResponsePart;

export interface GoogleContent {
    role: 'user' | 'model' | 'function';
    parts: GoogleContentPart[];
}

export interface GoogleCandidate {
    content: GoogleContent;
    finishReason: string;
}

export interface GoogleTokenDetails {
    modality: string;
    tokenCount: number;
}

export interface GoogleUsageMetadata {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    trafficType: string;
    promptTokensDetails: GoogleTokenDetails[];
    candidatesTokensDetails: GoogleTokenDetails[];
    thoughtsTokenCount: number;
}

export interface GoogleToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface GoogleMessage {
    role: 'user' | 'assistant' | 'tool';
    content?: string;
    tool_calls?: GoogleToolCall[];
    tool_call_id?: string;
    thought_signature?: string;
}

export class GoogleResponseAst extends Ast {
    candidates!: GoogleCandidate[];
    usageMetadata!: GoogleUsageMetadata;
    modelVersion!: string;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitGoogleResponseAst(this, ctx);
    }
}

export interface Visitor {
    visit(ast: Ast, ctx: any): any;
    visitAnthropicRequestAst(ast: AnthropicRequestAst, ctx: any): any;
    visitOpenAIRequestAst(ast: OpenAIRequestAst, ctx: any): any;
    visitGoogleRequestAst(ast: GoogleRequestAst, ctx: any): any;
    visitOpenAiResponseAst(ast: OpenAiResponseAst, ctx: any): any;
    visitGoogleResponseAst(ast: GoogleResponseAst, ctx: any): any;
    visitAnthropicResponseAst(ast: AnthropicResponseAst, ctx: any): any;
    visitAnthropicMessageStartAst(ast: AnthropicMessageStartAst, ctx: any): any;
    visitAnthropicContentBlockDeltaAst(ast: AnthropicContentBlockDeltaAst, ctx: any): any;
    visitAnthropicContentBlockStartAst(ast: AnthropicContentBlockStartAst, ctx: any): any;
    visitAnthropicContentBlockStopAst(ast: AnthropicContentBlockStopAst, ctx: any): any;
    visitAnthropicMessageDeltaAst(ast: AnthropicMessageDeltaAst, ctx: any): any;
    visitAnthropicMessageStopAst(ast: AnthropicMessageStopAst, ctx: any): any;
}