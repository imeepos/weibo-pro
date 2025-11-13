import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboAjaxStatusesMymblogAst } from "@sker/workflow-ast";
import React from "react";

const ConfigRow = ({ label, value }: { label: string; value: React.ReactNode }) =>
(
    <div className="flex justify-between items-center">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{value}</span>
    </div>
);

const WeiboAjaxStatusesMymblogComponent: React.FC<{ ast: WeiboAjaxStatusesMymblogAst }> = ({ ast }) => (
    <div className="space-y-1.5 text-xs">
        <div className="font-medium text-slate-200 mb-1">我的微博</div>
        {ast.uid && (
            <ConfigRow
                label="用户ID"
                value={ast.uid.slice(0, 8) + "..."}
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
export class WeiboAjaxStatusesMymblogAstRender {
    @Render(WeiboAjaxStatusesMymblogAst)
    render(ast: WeiboAjaxStatusesMymblogAst) {
        return <WeiboAjaxStatusesMymblogComponent ast={ast} />;
    }
}