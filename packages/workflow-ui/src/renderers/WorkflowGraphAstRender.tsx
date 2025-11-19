import { Injectable } from "@sker/core";
import { Render, WorkflowGraphAst, INode, IEdge } from "@sker/workflow";
import React, { useMemo } from "react";
import { Workflow } from "lucide-react";


const Thumbnail = ({ nodes, edges }: { nodes: INode[]; edges: IEdge[] }) => {
    const bounds = useMemo(() => {
        if (nodes.length === 0) return null;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x);
            maxY = Math.max(maxY, node.position.y);
        });

        return { minX, minY, maxX, maxY };
    }, [nodes]);

    if (!bounds || nodes.length === 0) {
        return (
            <div className="flex items-center justify-center w-full h-20 bg-slate-900 rounded border border-slate-700">
                <Workflow className="h-6 w-6 text-slate-600" />
            </div>
        );
    }

    const width = 160;
    const height = 80;
    const padding = 10;

    const scaleX = (width - padding * 2) / (bounds.maxX - bounds.minX || 1);
    const scaleY = (height - padding * 2) / (bounds.maxY - bounds.minY || 1);
    const scale = Math.min(scaleX, scaleY);

    const transform = (x: number, y: number) => ({
        x: (x - bounds.minX) * scale + padding,
        y: (y - bounds.minY) * scale + padding,
    });

    return (
        <svg
            width={width}
            height={height}
            className="bg-slate-900 rounded border border-slate-700"
        >
            {edges.map((edge, index) => {
                const source = nodes.find(n => n.id === edge.from);
                const target = nodes.find(n => n.id === edge.to);
                if (!source || !target) return null;

                const sourcePos = transform(source.position.x, source.position.y);
                const targetPos = transform(target.position.x, target.position.y);

                return (
                    <line
                        key={`${edge.from}-${edge.to}-${index}`}
                        x1={sourcePos.x}
                        y1={sourcePos.y}
                        x2={targetPos.x}
                        y2={targetPos.y}
                        stroke="#475569"
                        strokeWidth="1"
                    />
                );
            })}

            {nodes.map(node => {
                const pos = transform(node.position.x, node.position.y);
                return (
                    <circle
                        key={node.id}
                        cx={pos.x}
                        cy={pos.y}
                        r="3"
                        fill="#60a5fa"
                    />
                );
            })}
        </svg>
    );
};

const WorkflowGraphComponent: React.FC<{ ast: WorkflowGraphAst }> = ({ ast }) => {
    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.dispatchEvent(
            new CustomEvent('open-sub-workflow', {
                detail: { nodeId: ast.id, workflowAst: ast }
            })
        );
    };

    return (
        <div className="space-y-2 text-xs" onClick={handleEdit}>
            <Thumbnail nodes={ast.nodes} edges={ast.edges} />
        </div>
    );
};

@Injectable()
export class WorkflowGraphAstRender {
    @Render(WorkflowGraphAst)
    render(ast: WorkflowGraphAst) {
        return <WorkflowGraphComponent ast={ast} />;
    }
}