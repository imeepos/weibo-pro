import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { LlmStructuredOutputAst } from "@sker/workflow-ast";
import { MarkdownViewer } from "@sker/ui/components/ui/markdown-viewer";
import React from "react";

@Injectable()
export class LlmStructuredOutputAstRender {
    @Render(LlmStructuredOutputAst)
    render(ast: LlmStructuredOutputAst) {
        const outputs = ast.metadata?.outputs || [];
        const hasOutput = outputs.some(o => (ast as any)[o.property] !== undefined);

        if (!hasOutput) return null;

        const content = outputs
            .map(o => `**${o.title || o.property}**: ${(ast as any)[o.property] ?? ''}`)
            .join('\n\n');

        return <MarkdownViewer>{content}</MarkdownViewer>;
    }
}
