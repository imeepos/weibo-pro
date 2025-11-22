import { Injectable } from "@sker/core";
import { DateAst, Render, TextAreaAst } from "@sker/workflow";
import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

@Injectable()
export class DateAstRender {
    @Render(DateAst)
    render(ast: DateAst, ctx: any) {
        return (
            <div className="px-4 py-3">
                <div className="prose prose-sm prose-slate max-w-none">
                    {ast.dateStr}
                </div>
            </div>
        );
    }
}
