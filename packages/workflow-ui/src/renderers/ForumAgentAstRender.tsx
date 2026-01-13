import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { ForumAgentAst } from '@sker/workflow-ast'
import React from 'react'

const ForumAgentComponent: React.FC<{ ast: ForumAgentAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="font-medium text-foreground">论坛主持人</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>温度: {ast.temperature}</span>
                <span>topP: {ast.top_p}</span>
            </div>
            {ast.speechesText && (
                <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px]">发言记录:</span>
                    <p className="text-foreground line-clamp-4 text-[10px]">{ast.speechesText.slice(0, 200)}...</p>
                </div>
            )}
        </div>
    )
}

@Injectable()
export class ForumAgentAstRender {
    @Render(ForumAgentAst)
    render(ast: ForumAgentAst, ctx: any) {
        return <ForumAgentComponent ast={ast} />
    }
}
