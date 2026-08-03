import { Ast, Visitor } from './ast-common';

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
export interface AnthropicToolResultBlock {
    type: 'tool_result';
    tool_use_id: string;
    content: string;
    is_error?: boolean;
}

export type AnthropicContentBlock = AnthropicContentTextBlock | AnthropicContentThinkingBlock | AnthropicToolUseBlock | AnthropicToolResultBlock;

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
