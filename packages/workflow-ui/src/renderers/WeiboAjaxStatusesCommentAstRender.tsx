import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboAjaxStatusesCommentAst } from "@sker/workflow-ast";
import React from "react";

const WeiboAjaxStatusesCommentComponent: React.FC<{ ast: WeiboAjaxStatusesCommentAst }> = ({ ast }) => (
    <></>
);

@Injectable()
export class WeiboAjaxStatusesCommentAstRender {
    @Render(WeiboAjaxStatusesCommentAst)
    render(ast: WeiboAjaxStatusesCommentAst) {
        return <WeiboAjaxStatusesCommentComponent ast={ast} />;
    }
}