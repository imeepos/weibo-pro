import { Injectable } from "@sker/core";
import { Render, TextAreaAst } from "@sker/workflow";
import { MarkdownViewer } from "@sker/ui/components/ui";
import React from "react";

@Injectable()
export class TextAreaAstRender {
    @Render(TextAreaAst)
    render(ast: TextAreaAst, ctx: any) {
        return <MarkdownViewer>{ast.input}</MarkdownViewer>;
    }
}

