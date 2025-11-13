import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { EventAutoCreatorAst } from "@sker/workflow-ast";
import React from "react";

const ConfigRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-center">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{value}</span>
    </div>
);

const EventAutoCreatorComponent: React.FC<{ ast: EventAutoCreatorAst }> = ({ ast }) => (
    <div className="space-y-1.5 text-xs">
        <div className="font-medium text-slate-200 mb-1">事件自动创建</div>
        {ast.nlpResult && (
            <ConfigRow
                label="NLP结果"
                value={`情感: ${ast.nlpResult.sentiment}, 关键词: ${ast.nlpResult.keywords?.length || 0}个`}
            />
        )}
        {ast.post && (
            <ConfigRow
                label="来源帖子"
                value={`${ast.post.text?.slice(0, 12) || '无内容'}...`}
            />
        )}
        {!ast.nlpResult && !ast.post && (
            <div className="text-slate-400 italic">等待输入数据...</div>
        )}
    </div>
);

@Injectable()
export class EventAutoCreatorAstRender {
    @Render(EventAutoCreatorAst)
    render(ast: EventAutoCreatorAst) {
        return <EventAutoCreatorComponent ast={ast} />;
    }
}