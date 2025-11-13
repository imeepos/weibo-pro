import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboAjaxStatusesShowAst } from "@sker/workflow-ast";
import React from "react";

const ConfigRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-center">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{value}</span>
    </div>
);

const truncate = (str: string, len = 10) =>
    str.length > len ? `${str.slice(0, len)}...` : str;

const WeiboAjaxStatusesShowComponent: React.FC<{ ast: WeiboAjaxStatusesShowAst }> = ({ ast }) => (
    <div className="space-y-1.5 text-xs">
        <div className="font-medium text-slate-200 mb-1">微博详情获取</div>
        {ast.mblogid && (
            <ConfigRow
                label="微博ID"
                value={truncate(ast.mblogid, 8)}
            />
        )}
        {ast.uid && (
            <ConfigRow
                label="用户ID"
                value={truncate(ast.uid, 8)}
            />
        )}
        {ast.mid && (
            <ConfigRow
                label="消息ID"
                value={truncate(ast.mid, 8)}
            />
        )}
    </div>
);

@Injectable()
export class WeiboAjaxStatusesShowAstRender {
    @Render(WeiboAjaxStatusesShowAst)
    render(ast: WeiboAjaxStatusesShowAst) {
        return <WeiboAjaxStatusesShowComponent ast={ast} />;
    }
}