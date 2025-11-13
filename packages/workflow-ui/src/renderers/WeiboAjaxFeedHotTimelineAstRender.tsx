import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboAjaxFeedHotTimelineAst } from "@sker/workflow-ast";
import React from "react";

const ConfigRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-center">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{value}</span>
    </div>
);

const truncate = (str: string, len = 8) =>
    str.length > len ? `${str.slice(0, len)}...` : str;

const WeiboAjaxFeedHotTimelineComponent: React.FC<{ ast: WeiboAjaxFeedHotTimelineAst }> = ({ ast }) => (
    <div className="space-y-1.5 text-xs">{ast.type}</div>
);

@Injectable()
export class WeiboAjaxFeedHotTimelineAstRender {
    @Render(WeiboAjaxFeedHotTimelineAst)
    render(ast: WeiboAjaxFeedHotTimelineAst) {
        return <WeiboAjaxFeedHotTimelineComponent ast={ast} />;
    }
}