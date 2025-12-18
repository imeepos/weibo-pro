import { Injectable } from "@sker/core";
import { Render, TextAreaAst, serializeToString } from "@sker/workflow";
import { MarkdownViewer } from "@sker/ui/components/ui/markdown-viewer";
import React from "react";

@Injectable()
export class TextAreaAstRender {
    @Render(TextAreaAst)
    render(ast: TextAreaAst, ctx: any) {
        const output = serializeToString(ast.output || ast.input)
        return <MarkdownViewer showFullscreen maxHeight="300px">{output}</MarkdownViewer>;
    }
}
