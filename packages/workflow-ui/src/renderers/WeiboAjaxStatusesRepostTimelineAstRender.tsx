import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboAjaxStatusesRepostTimelineAst } from "@sker/workflow-ast";
import React from "react";

const ConfigRow = ({ label, value }: { label: string; value: React.ReactNode }) =>
(
    <div className="flex justify-between items-center">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{value}</span>
    </div>
);

const truncate = (str: string, len = 10) =>
    str.length > len ? `${str.slice(0, len)}...` : str;

const WeiboAjaxStatusesRepostTimelineComponent: React.FC<{ ast: WeiboAjaxStatusesRepostTimelineAst }> = ({ ast }) => (
    <div className="space-y-1.5 text-xs">
        <div className="font-medium text-slate-200 mb-1">转发时间线</div>
        {ast.mid && (
            <ConfigRow
                label="消息ID"
                value={truncate(ast.mid, 8)}
            />
        )}
        {ast.uid && (
            <ConfigRow
                label="用户ID"
                value={truncate(ast.uid, 8)}
            />
        )}
        {ast.page && ast.page > 1 && (
            <ConfigRow
                label="页码"
                value={ast.page}
            />
        )}
    </div>
);

@Injectable()
export class WeiboAjaxStatusesRepostTimelineAstRender {
    @Render(WeiboAjaxStatusesRepostTimelineAst)
    render(ast: WeiboAjaxStatusesRepostTimelineAst) {
        return <WeiboAjaxStatusesRepostTimelineComponent ast={ast} />;
    }
}