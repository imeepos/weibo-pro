import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { AnswerFinalizerAst } from "@sker/workflow-ast";
import React from "react";

@Injectable()
export class AnswerFinalizerAstRender {
    @Render(AnswerFinalizerAst)
    render(ast: AnswerFinalizerAst, ctx: any) {
        return <div></div>
    }
}
