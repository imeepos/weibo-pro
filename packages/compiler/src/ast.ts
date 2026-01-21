

export abstract class Ast {
    abstract visit(visitor: Visitor, ctx: any): any;
}
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


export interface Visitor {
    visit(ast: Ast, ctx: any): any;
    visitOpenAiResponseAst(ast: OpenAiResponseAst, ctx: any): any;
    visitAnthropicResponseAst(ast: AnthropicResponseAst, ctx: any): any;
    visitAnthropicMessageStartAst(ast: AnthropicMessageStartAst, ctx: any): any;
    visitAnthropicContentBlockDeltaAst(ast: AnthropicContentBlockDeltaAst, ctx: any): any;
    visitAnthropicContentBlockStartAst(ast: AnthropicContentBlockStartAst, ctx: any): any;
    visitAnthropicContentBlockStopAst(ast: AnthropicContentBlockStopAst, ctx: any): any;
    visitAnthropicMessageDeltaAst(ast: AnthropicMessageDeltaAst, ctx: any): any;
    visitAnthropicMessageStopAst(ast: AnthropicMessageStopAst, ctx: any): any;
}