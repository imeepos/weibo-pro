import { Injectable } from "@sker/core";
import { Render, TextAreaAst } from "@sker/workflow";
import React from "react";

@Injectable()
export class TextAreaAstRender {
    @Render(TextAreaAst)
    render(ast: TextAreaAst, ctx: any) {
        return <div className="px-2">
            <textarea className="px-2" rows={3} value={ast.input} readOnly/>
        </div>
    }
}

