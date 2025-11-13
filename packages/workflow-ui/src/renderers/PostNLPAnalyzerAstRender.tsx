import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { PostNLPAnalyzerAst } from "@sker/workflow-ast";
import React from "react";

const ConfigRow = ({ label, value }: { label: string; value: React.ReactNode }) =>
(
    <div className="flex justify-between items-center">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{value}</span>
    </div>
);

const PostNLPAnalyzerComponent: React.FC<{ ast: PostNLPAnalyzerAst }> = ({ ast }) => (
    <div className="space-y-1.5 text-xs">
        <div className="font-medium text-slate-200 mb-1">帖子NLP分析</div>
        {ast.post && (
            <ConfigRow
                label="帖子"
                value={`${ast.post.text?.slice(0, 15) || '无内容'}...`}
            />
        )}
        {ast.comments?.length > 0 && (
            <ConfigRow
                label="评论数"
                value={ast.comments.length}
            />
        )}
        {ast.reposts?.length > 0 && (
            <ConfigRow
                label="转发数"
                value={ast.reposts.length}
            />
        )}
        {!ast.post && !ast.comments?.length && !ast.reposts?.length && (
            <div className="text-slate-400 italic">等待输入帖子数据...</div>
        )}
    </div>
);

@Injectable()
export class PostNLPAnalyzerAstRender {
    @Render(PostNLPAnalyzerAst)
    render(ast: PostNLPAnalyzerAst) {
        return <PostNLPAnalyzerComponent ast={ast} />;
    }
}