import { Injectable } from "@sker/core";
import { DateAst, Render } from "@sker/workflow";
import React from "react";

@Injectable()
export class DateAstRender {
    @Render(DateAst)
    render(ast: DateAst, ctx: any) {
        return (
            <div className="prose prose-sm prose-slate max-w-none">
                {ast.dateStr}
            </div>
        );
    }
}
