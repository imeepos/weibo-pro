import { Injectable } from "@sker/core";
import { Render, TextAreaAst } from "@sker/workflow";
import { MarkdownViewer } from "@sker/ui/components/ui/markdown-viewer";
import React from "react";

@Injectable()
export class TextAreaAstRender {
    @Render(TextAreaAst)
    render(ast: TextAreaAst, ctx: any) {
        return <MarkdownViewer>{Array.isArray(ast.input) ? ast.input.join('\n') : ast.input}</MarkdownViewer>;
    }
}

