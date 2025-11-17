import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboAjaxFeedHotTimelineAst } from "@sker/workflow-ast";
import React from "react";


const WeiboAjaxFeedHotTimelineComponent: React.FC<{ ast: WeiboAjaxFeedHotTimelineAst }> = ({ ast }) => {
    return <></>
};

@Injectable()
export class WeiboAjaxFeedHotTimelineAstRender {
    @Render(WeiboAjaxFeedHotTimelineAst)
    render(ast: WeiboAjaxFeedHotTimelineAst) {
        return <WeiboAjaxFeedHotTimelineComponent ast={ast} />;
    }
}