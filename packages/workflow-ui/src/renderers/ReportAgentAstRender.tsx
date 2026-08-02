import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { ReportAgentAst } from '@sker/workflow-ast'
import React from 'react'

const ReportAgentComponent: React.FC<{ ast: ReportAgentAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="font-medium text-foreground">舆情报告专家</span>
            </div>
            {ast.topic && (
                <div className="space-y-1">
                    <span className="text-muted-foreground text-[10px]">分析主题:</span>
                    <p className="text-foreground line-clamp-2">{ast.topic}</p>
                </div>
            )}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>温度: {ast.temperature}</span>
                <span>topP: {ast.top_p}</span>
            </div>
            {ast.report && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">舆情报告:</span>
                    <p className="text-foreground line-clamp-4 text-[10px]">{ast.report.slice(0, 200)}...</p>
                    <span className="text-muted-foreground text-[10px]">{ast.report.length} 字</span>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class ReportAgentAstRender {
    @Render(ReportAgentAst)
    render(ast: ReportAgentAst, _ctx: any) {
        return <ReportAgentComponent ast={ast} />
    }
}
