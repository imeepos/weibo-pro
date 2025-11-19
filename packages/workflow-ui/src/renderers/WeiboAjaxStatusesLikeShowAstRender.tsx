import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboAjaxStatusesLikeShowAst } from "@sker/workflow-ast";
import React from "react";

const WeiboAjaxStatusesLikeShowComponent: React.FC<{ ast: WeiboAjaxStatusesLikeShowAst }> = ({ ast }) => (
    <></>
);

@Injectable()
export class WeiboAjaxStatusesLikeShowAstRender {
    @Render(WeiboAjaxStatusesLikeShowAst)
    render(ast: WeiboAjaxStatusesLikeShowAst) {
        return <WeiboAjaxStatusesLikeShowComponent ast={ast} />;
    }
}