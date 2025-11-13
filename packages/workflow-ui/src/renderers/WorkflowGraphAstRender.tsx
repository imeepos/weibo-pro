import { Injectable } from "@sker/core";
import { Render, WorkflowGraphAst, INode, IEdge } from "@sker/workflow";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { Edit, Workflow } from "lucide-react";

const EditableName = ({ value, onChange }: { value: string; onChange: (name: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        const trimmed = localValue.trim();
        if (trimmed && trimmed !== value) {
            onChange(trimmed);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setLocalValue(value);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="w-full px-1 py-0.5 text-slate-200 font-medium text-xs bg-slate-700 border border-slate-500 rounded outline-none"
                onClick={(e) => e.stopPropagation()}
            />
        );
    }

    return (
        <div
            className="text-slate-200 font-medium truncate cursor-text hover:text-slate-100"
            onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
            }}
            title="点击编辑名称"
        >
            {value || '未命名工作流'}
        </div>
    );
};

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

    const handleNameChange = (newName: string) => {
        ast.name = newName;
    };

    return (
        <div className="space-y-2 text-xs">
            {/* 名称 */}
            <EditableName
                value={ast.name || ''}
                onChange={handleNameChange}
            />

            {/* 缩略图 */}
            <Thumbnail nodes={ast.nodes} edges={ast.edges} />

            <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] transition w-full justify-center"
            >
                <Edit className="h-3 w-3" />
                <span>编辑工作流</span>
            </button>
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