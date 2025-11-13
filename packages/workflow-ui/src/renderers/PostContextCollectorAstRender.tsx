import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { PostContextCollectorAst } from "@sker/workflow-ast";
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

const PostContextCollectorComponent: React.FC<{ ast: PostContextCollectorAst }> = ({ ast }) => (
    <div className="space-y-1.5 text-xs">
        <div className="font-medium text-slate-200 mb-1">帖子上下文收集</div>
        {ast.postId && (
            <ConfigRow
                label="帖子ID"
                value={truncate(ast.postId, 8)}
            />
        )}
        {!ast.postId && (
            <div className="text-slate-400 italic">等待输入帖子ID...</div>
        )}
    </div>
);

@Injectable()
export class PostContextCollectorAstRender {
    @Render(PostContextCollectorAst)
    render(ast: PostContextCollectorAst) {
        return <PostContextCollectorComponent ast={ast} />;
    }
}