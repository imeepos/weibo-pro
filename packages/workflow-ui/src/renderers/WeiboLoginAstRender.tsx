import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboLoginAst } from "@sker/workflow-ast";
import React from "react";

const ConfigRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-center">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{value}</span>
    </div>
);

const WeiboLoginComponent: React.FC<{ ast: WeiboLoginAst }> = ({ ast }) => (
    <div className="space-y-1.5 text-xs">
        <div className="font-medium text-slate-200 mb-1">微博登录</div>
        {ast.userId && (
            <ConfigRow
                label="用户ID"
                value={ast.userId}
            />
        )}
        {!ast.userId && (
            <div className="text-slate-400 italic">等待登录配置...</div>
        )}
    </div>
);

@Injectable()
export class WeiboLoginAstRender {
    @Render(WeiboLoginAst)
    render(ast: WeiboLoginAst) {
        return <WeiboLoginComponent ast={ast} />;
    }
}