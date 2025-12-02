import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { CollectorAst } from "@sker/workflow-ast";
import React from "react";
import { Database, Layers, Package } from 'lucide-react';

/**
 * CollectorAst 渲染组件
 *
 * 展示 IS_BUFFER 模式收集的数据
 */
const CollectorComponent: React.FC<{ ast: CollectorAst }> = ({ ast }) => {
    const itemsCount = ast.items?.length || 0;
    const allDataCount = ast.allData?.length || 0;
    const totalCount = ast.result?.count || (itemsCount + allDataCount);

    // 节点状态颜色
    const getStateColor = (state?: string) => {
        switch (state) {
            case 'success': return '#10b981';
            case 'fail': return '#ef4444';
            case 'running': return '#3b82f6';
            case 'emitting': return '#8b5cf6';
            default: return '#64748b';
        }
    };

    const stateColor = getStateColor(ast.state);

    return (
        <div className="px-3 py-2 space-y-2 min-w-[200px]">
            {/* 标题区域 */}
            <div
                className="flex items-center gap-2 pb-2 border-b"
                style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}
            >
                <Database
                    size={14}
                    style={{ color: stateColor }}
                    className="shrink-0"
                />
                <span className="text-xs font-medium text-slate-200">
                    收集器
                </span>
            </div>

            {/* 统计信息 */}
            <div className="space-y-1.5">
                {/* 总计 */}
                <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                        <Package size={10} />
                        总计
                    </span>
                    <span
                        className="font-mono font-medium"
                        style={{ color: stateColor }}
                    >
                        {totalCount}
                    </span>
                </div>

                {/* IS_BUFFER：单边发射 */}
                {itemsCount > 0 && (
                    <div className="flex items-center justify-between text-[11px] pl-2">
                        <span className="text-slate-500">
                            数据流
                        </span>
                        <span className="font-mono text-slate-300">
                            {itemsCount}
                        </span>
                    </div>
                )}

                {/* IS_MULTI | IS_BUFFER：所有边发射 */}
                {allDataCount > 0 && (
                    <div className="flex items-center justify-between text-[11px] pl-2">
                        <span className="text-slate-500 flex items-center gap-1">
                            <Layers size={10} />
                            全部数据
                        </span>
                        <span className="font-mono text-slate-300">
                            {allDataCount}
                        </span>
                    </div>
                )}
            </div>

            {/* 状态提示 */}
            {ast.state === 'pending' && (
                <div className="text-[10px] text-slate-500 text-center py-1">
                    等待上游完成...
                </div>
            )}

            {ast.state === 'running' && (
                <div className="text-[10px] text-blue-400 text-center py-1">
                    收集中...
                </div>
            )}

            {ast.state === 'success' && totalCount > 0 && (
                <div
                    className="text-[10px] text-center py-1 px-2 rounded"
                    style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981'
                    }}
                >
                    已收集 {totalCount} 项数据
                </div>
            )}

            {ast.state === 'fail' && ast.error && (
                <div
                    className="text-[10px] text-center py-1 px-2 rounded"
                    style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444'
                    }}
                >
                    收集失败
                </div>
            )}
        </div>
    );
};

@Injectable()
export class CollectorAstRender {
    @Render(CollectorAst)
    render(ast: CollectorAst, ctx: any) {
        return <CollectorComponent ast={ast} />;
    }
}
