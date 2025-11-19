import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboAjaxProfileInfoAst } from "@sker/workflow-ast";
import React from "react";

@Injectable()
export class WeiboAjaxProfileInfoAstRender {
    @Render(WeiboAjaxProfileInfoAst)
    render(ast: WeiboAjaxProfileInfoAst) {
        return (
            <></>
        );
    }
}