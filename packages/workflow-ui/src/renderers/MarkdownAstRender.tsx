import { Injectable } from "@sker/core";
import { Render, MarkdownAst, serializeToString } from "@sker/workflow";
import { MarkdownViewer } from "@sker/ui/components/ui/markdown-viewer";
import React from "react";

@Injectable()
export class MarkdownAstRender {
    @Render(MarkdownAst)
    render(ast: MarkdownAst, ctx: any) {
        const output = serializeToString(ast.output || ast.input)
        return <MarkdownViewer showFullscreen maxHeight="300px">{output}</MarkdownViewer>;
    }
}
