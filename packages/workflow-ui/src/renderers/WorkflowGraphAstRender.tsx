import { Injectable } from "@sker/core";
import { Render, WorkflowGraphAst } from "@sker/workflow";
import React from "react";
import { Folder, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react';

const GroupCollapsedCard: React.FC<{ ast: WorkflowGraphAst }> = ({ ast }) => {
    const nodeCount = ast.nodes.length;
    const edgeCount = ast.edges.length;
    const title = ast.name || '未命名分组';
    const color = ast.color || '#3b82f6';

    return (
        <div
            className="px-3 py-2 space-y-1 min-w-[180px]"
            style={{
                borderLeft: `3px solid ${color}`,
            }}
        >
            <div className="flex items-center gap-2">
                <Folder size={14} style={{ color }} className="shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">
                    {title}
                </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span>{nodeCount} 节点</span>
                <span>{edgeCount} 连接</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <ChevronDown size={10} />
                <span>双击展开</span>
            </div>
        </div>
    );
};

const GroupExpandedContainer: React.FC<{ ast: WorkflowGraphAst }> = ({ ast }) => {
    const title = ast.name || '未命名分组';
    const color = ast.color || '#3b82f6';

    return (
        <div className="px-3 py-2 space-y-1 min-w-[200px]">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-700">
                <FolderOpen size={14} style={{ color }} className="shrink-0" />
                <span className="text-xs font-medium text-slate-200 truncate">
                    {title}
                </span>
            </div>
            <div className="text-[10px] text-slate-400 text-center py-2">
                展开视图（嵌套工作流）
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 justify-center">
                <ChevronUp size={10} />
                <span>双击折叠</span>
            </div>
        </div>
    );
};

const WorkflowGraphComponent: React.FC<{ ast: WorkflowGraphAst }> = ({ ast }) => {
    if (!ast.isGroup) {
        return null;
    }

    if (ast.collapsed) {
        return <GroupCollapsedCard ast={ast} />;
    }

    return <GroupExpandedContainer ast={ast} />;
};

@Injectable()
export class WorkflowGraphAstRender {
    @Render(WorkflowGraphAst)
    render(ast: WorkflowGraphAst) {
        return <WorkflowGraphComponent ast={ast} />;
    }
}