import { Ast, Visitor } from './ast-common';

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
