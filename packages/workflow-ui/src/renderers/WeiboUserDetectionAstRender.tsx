import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboUserDetectionAst } from "@sker/workflow-ast";
import React from 'react'

@Injectable()
export class WeiboUserDetectionAstRender {

    @Render(WeiboUserDetectionAst)
    render(ast: WeiboUserDetectionAst) {
        return <></>
    }
}