import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { BatchPushToMQAst, BatchPushMode } from "@sker/workflow-ast";
import React from "react";

const ConfigRow = ({ label, value }: { label: string; value: React.ReactNode }) =>
(
    <div className="flex justify-between items-center">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-mono">{value}</span>
    </div>
);

const BatchPushToMQComponent: React.FC<{ ast: BatchPushToMQAst }> = ({ ast }) => {
    const modeText = ast.mode === BatchPushMode.ALL_AT_ONCE ? '批量推送' : '逐个推送';

    return (
        <div className="space-y-1.5 text-xs">
            <div className="font-medium text-slate-200 mb-1">批量推送MQ</div>
            {ast.queueName && (
                <ConfigRow
                    label="队列名称"
                    value={ast.queueName}
                />
            )}
            {ast.mode && (
                <ConfigRow
                    label="推送模式"
                    value={modeText}
                />
            )}
            {ast.items?.length > 0 && (
                <ConfigRow
                    label="数据项数"
                    value={ast.items.length}
                />
            )}
            {!ast.queueName && (
                <div className="text-slate-400 italic">等待队列配置...</div>
            )}
        </div>
    );
};

@Injectable()
export class BatchPushToMQAstRender {
    @Render(BatchPushToMQAst)
    render(ast: BatchPushToMQAst) {
        return <BatchPushToMQComponent ast={ast} />;
    }
}