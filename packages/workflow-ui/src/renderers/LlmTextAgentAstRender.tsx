import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { LlmTextAgentAst } from "@sker/workflow-ast";
import React from "react";

@Injectable()
export class LlmTextAgentAstRender {
    @Render(LlmTextAgentAst)
    render(_ast: LlmTextAgentAst, _ctx: any) {
        return <div></div>
    }
}
