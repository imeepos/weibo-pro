import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboAjaxStatusesRepostTimelineAst } from "@sker/workflow-ast";
import React from "react";

const WeiboAjaxStatusesRepostTimelineComponent: React.FC<{ ast: WeiboAjaxStatusesRepostTimelineAst }> = ({ ast }) => (
    <></>
);

@Injectable()
export class WeiboAjaxStatusesRepostTimelineAstRender {
    @Render(WeiboAjaxStatusesRepostTimelineAst)
    render(ast: WeiboAjaxStatusesRepostTimelineAst) {
        return <WeiboAjaxStatusesRepostTimelineComponent ast={ast} />;
    }
}