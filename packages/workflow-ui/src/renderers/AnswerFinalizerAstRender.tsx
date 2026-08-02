import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { AnswerFinalizerAst } from "@sker/workflow-ast";
import React from "react";

@Injectable()
export class AnswerFinalizerAstRender {
    @Render(AnswerFinalizerAst)
    render(_ast: AnswerFinalizerAst, _ctx: any) {
        return <div></div>
    }
}
