import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { QueryAgentAst } from '@sker/workflow-ast'
import React from 'react'

const QueryAgentComponent: React.FC<{ ast: QueryAgentAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-medium text-foreground">新闻搜索专家</span>
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
            {ast.analysisResult && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">分析结果:</span>
                    <p className="text-foreground line-clamp-4 text-[10px]">{ast.analysisResult.slice(0, 200)}...</p>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class QueryAgentAstRender {
    @Render(QueryAgentAst)
    render(ast: QueryAgentAst, _ctx: any) {
        return <QueryAgentComponent ast={ast} />
    }
}
