import type {
    AnthropicRequestAst,
    AnthropicResponseAst,
    AnthropicMessageStartAst,
    AnthropicContentBlockDeltaAst,
    AnthropicContentBlockStartAst,
    AnthropicContentBlockStopAst,
    AnthropicMessageDeltaAst,
    AnthropicMessageStopAst,
} from './ast-anthropic';
import type {
    OpenAIRequestAst,
    OpenAiResponseAst,
} from './ast-openai';
import type {
    GoogleRequestAst,
    GoogleResponseAst,
} from './ast-google';
import type {
    UnifiedRequestAst,
    UnifiedResponseAst,
    UnifiedStreamEventAst,
} from './ast-unified';

export abstract class Ast {
    abstract visit(visitor: Visitor, ctx: any): any;
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
    visitUnifiedRequestAst(ast: UnifiedRequestAst, ctx: any): any;
    visitUnifiedResponseAst(ast: UnifiedResponseAst, ctx: any): any;
    visitUnifiedStreamEventAst(ast: UnifiedStreamEventAst, ctx: any): any;
}
