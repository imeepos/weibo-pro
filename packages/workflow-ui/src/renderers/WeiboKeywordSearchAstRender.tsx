import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboKeywordSearchAst } from "@sker/workflow-ast";
import React from "react";

const ConfigRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-center">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{value}</span>
    </div>
);

const truncate = (str: string, len = 12) =>
    str.length > len ? `${str.slice(0, len)}...` : str;

const WeiboKeywordSearchComponent: React.FC<{ ast: WeiboKeywordSearchAst }> = ({ ast }) => (
    <div className="space-y-1.5 text-xs">
        <div className="font-medium text-slate-200 mb-1">微博关键词搜索</div>
        {ast.keyword && (
            <ConfigRow
                label="关键词"
                value={truncate(ast.keyword, 10)}
            />
        )}
        {ast.page > 1 && (
            <ConfigRow
                label="页码"
                value={ast.page}
            />
        )}
        {ast.startDate && (
            <ConfigRow
                label="开始日期"
                value={ast.startDate.toLocaleDateString('zh-CN')}
            />
        )}
        {ast.endDate && (
            <ConfigRow
                label="结束日期"
                value={ast.endDate.toLocaleDateString('zh-CN')}
            />
        )}
    </div>
);

@Injectable()
export class WeiboKeywordSearchAstRender {
    @Render(WeiboKeywordSearchAst)
    render(ast: WeiboKeywordSearchAst) {
        return <WeiboKeywordSearchComponent ast={ast} />;
    }
}