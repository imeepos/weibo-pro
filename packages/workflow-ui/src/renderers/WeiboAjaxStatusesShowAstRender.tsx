import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboAjaxStatusesShowAst } from "@sker/workflow-ast";
import React from "react";

const WeiboAjaxStatusesShowComponent: React.FC<{ ast: WeiboAjaxStatusesShowAst }> = ({ ast }) => (
    <></>
);

@Injectable()
export class WeiboAjaxStatusesShowAstRender {
    @Render(WeiboAjaxStatusesShowAst)
    render(ast: WeiboAjaxStatusesShowAst) {
        return <WeiboAjaxStatusesShowComponent ast={ast} />;
    }
}