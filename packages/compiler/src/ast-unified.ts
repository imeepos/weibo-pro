import { Ast, Visitor } from './ast-common';

// ==================== 统一请求 AST ====================

export type UnifiedProvider = 'anthropic' | 'openai' | 'google';
export type UnifiedRole = 'system' | 'user' | 'assistant' | 'tool';

export interface UnifiedMessage {
    role: UnifiedRole;
    content: string | UnifiedContent[];
}

export interface UnifiedTextContent {
    type: 'text';
    text: string;
}

export interface UnifiedThinkingContent {
    type: 'thinking';
    thinking: string;
    signature?: string;
}

export interface UnifiedToolUseContent {
    type: 'tool_use';
    id: string;
    name: string;
    input: Record<string, unknown>;
}

export interface UnifiedToolResultContent {
    type: 'tool_result';
    toolUseId: string;
    content: string;
    isError?: boolean;
}

export interface UnifiedImageContent {
    type: 'image';
    source: { type: 'base64' | 'url'; mediaType?: string; data?: string; url?: string };
}

export type UnifiedContent = UnifiedTextContent | UnifiedThinkingContent | UnifiedToolUseContent | UnifiedToolResultContent | UnifiedImageContent;

export type UnifiedStopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | 'content_filter' | 'error';

export interface UnifiedUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
    _anthropic?: { cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
    _openai?: { prompt_tokens_details?: any; completion_tokens_details?: any };
    _google?: { trafficType?: string; promptTokensDetails?: any[]; candidatesTokensDetails?: any[]; thoughtsTokenCount?: number };
}

export class UnifiedRequestAst extends Ast {
    model!: string;
    messages!: UnifiedMessage[];
    system?: string;
    tools?: UnifiedTool[];
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    stream?: boolean;
    stopSequences?: string[];
    _provider?: UnifiedProvider;
    _original?: any;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitUnifiedRequestAst(this, ctx);
    }
}

export class UnifiedResponseAst extends Ast {
    id?: string;
    model?: string;
    role!: 'assistant';
    content!: UnifiedContent[];
    stopReason?: UnifiedStopReason;
    usage?: UnifiedUsage;
    _provider?: UnifiedProvider;
    _original?: any;
    _anthropic?: { stop_sequence?: string | null; type?: string };
    _openai?: { object?: string; created?: number; system_fingerprint?: string };
    _google?: { modelVersion?: string; finishReason?: string };
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitUnifiedResponseAst(this, ctx);
    }
}

export type UnifiedStreamEventType = 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop';

export class UnifiedStreamEventAst extends Ast {
    eventType!: UnifiedStreamEventType;
    message?: Partial<UnifiedResponseAst>;
    contentBlock?: { index: number; type: string; delta?: Partial<UnifiedContent> };
    _provider?: UnifiedProvider;
    _original?: any;
    visit(visitor: Visitor, ctx: any) {
        return visitor.visitUnifiedStreamEventAst(this, ctx);
    }
}

// 工具定义类型
export interface UnifiedToolParameters {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[]; items?: any }>;
    required?: string[];
}

export interface UnifiedTool {
    name: string;
    description: string;
    parameters: UnifiedToolParameters;
}
