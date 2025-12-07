import { Injectable } from "@sker/core";
import { Render, TextAreaAst } from "@sker/workflow";
import { MarkdownViewer } from "@sker/ui/components/ui/markdown-viewer";
import React from "react";
const toString = (ast: any): string => {
    if (typeof ast === 'string') return ast;
    if (Array.isArray(ast)) {
        return ast.flat().map(it => toString(it)).join('\n\n')
    }
    return JSON.stringify(ast)
}
@Injectable()
export class TextAreaAstRender {
    @Render(TextAreaAst)
    render(ast: TextAreaAst, ctx: any) {
        const output = toString(ast.input)
        return <MarkdownViewer>{output}</MarkdownViewer>;
    }
}

