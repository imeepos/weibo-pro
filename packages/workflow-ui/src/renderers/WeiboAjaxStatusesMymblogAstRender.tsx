import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboAjaxStatusesMymblogAst } from "@sker/workflow-ast";
import React from "react";

const WeiboAjaxStatusesMymblogComponent: React.FC<{ ast: WeiboAjaxStatusesMymblogAst }> = ({ ast }) => (
    <></>
);

@Injectable()
export class WeiboAjaxStatusesMymblogAstRender {
    @Render(WeiboAjaxStatusesMymblogAst)
    render(ast: WeiboAjaxStatusesMymblogAst) {
        return <WeiboAjaxStatusesMymblogComponent ast={ast} />;
    }
}