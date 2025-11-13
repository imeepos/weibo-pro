import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboAjaxStatusesCommentAst } from "@sker/workflow-ast";
import React from "react";

const ConfigRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-center">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{value}</span>
    </div>
);

const truncate = (str: string, len = 10) =>
    str.length > len ? `${str.slice(0, len)}...` : str;

const WeiboAjaxStatusesCommentComponent: React.FC<{ ast: WeiboAjaxStatusesCommentAst }> = ({ ast }) => (
    <div className="space-y-1.5 text-xs">
        <div className="font-medium text-slate-200 mb-1">微博评论获取</div>
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
        {ast.count && ast.count !== 20 && (
            <ConfigRow
                label="数量"
                value={ast.count}
            />
        )}
        {ast.max_id && (
            <ConfigRow
                label="最大ID"
                value={String(ast.max_id).slice(0, 8)}
            />
        )}
    </div>
);

@Injectable()
export class WeiboAjaxStatusesCommentAstRender {
    @Render(WeiboAjaxStatusesCommentAst)
    render(ast: WeiboAjaxStatusesCommentAst) {
        return <WeiboAjaxStatusesCommentComponent ast={ast} />;
    }
}