import { Injectable } from "@sker/core";
import { Render, TextAreaAst } from "@sker/workflow";
import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

@Injectable()
export class TextAreaAstRender {
    @Render(TextAreaAst)
    render(ast: TextAreaAst, ctx: any) {
        return (
            <div className="prose prose-sm prose-slate max-w-none">
                <Markdown remarkPlugins={[remarkGfm]}>
                    {Array.isArray(ast.input) ? ast.input.join('\n') : ast.input}
                </Markdown>
            </div>
        );
    }
}

