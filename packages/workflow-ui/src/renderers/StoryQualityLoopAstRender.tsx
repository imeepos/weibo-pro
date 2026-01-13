import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { StoryQualityLoopAst } from '@sker/workflow-ast'
import React from 'react'

const StoryQualityLoopComponent: React.FC<{ ast: StoryQualityLoopAst }> = ({ ast }) => {
    return (
        <div className="px-2 py-1 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">最低质量分:</span>
                <code className="font-mono text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    {ast.minQualityScore}
                </code>
            </div>
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">最大重试:</span>
                <code className="font-mono text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    {ast.maxRetries} 次
                </code>
            </div>
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">当前尝试:</span>
                <code className="font-mono text-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    {ast.currentAttempt}
                </code>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                <span className="text-muted-foreground">状态:</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    ast.isComplete
                        ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                }`}>
                    {ast.isComplete ? '已完成' : '进行中'}
                </span>
            </div>
        </div>
    )
}

@Injectable()
export class StoryQualityLoopAstRender {
    @Render(StoryQualityLoopAst)
    render(ast: StoryQualityLoopAst, ctx: any) {
        return <StoryQualityLoopComponent ast={ast} />
    }
}
